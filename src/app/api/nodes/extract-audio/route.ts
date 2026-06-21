import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const ExtractAudioPayload = z.object({
  videoUrl: z.string(),
  format: z.enum(["mp3", "wav", "aac"]).default("mp3"),
  transcribeWithGemini: z.boolean().default(true),
});

const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ExtractAudioPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { videoUrl, format, transcribeWithGemini } = parsed.data;

  // Dev mode placeholder
  if (videoUrl.startsWith("data:") && videoUrl.includes("placeholder")) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({
      error: "Dev mode: Please configure Transloadit to upload real videos.",
    }, { status: 422 });
  }

  try {
    const tmp = tmpdir();
    const inputPath = join(tmp, `input-${userId}-${Date.now()}.mp4`);
    const outputPath = join(tmp, `output-${userId}-${Date.now()}.${format}`);

    // Download video file
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error("Failed to fetch video");

    // Write video to temp file using stream reader
    const fs = await import("fs");
    const nodeWriteStream = fs.createWriteStream(inputPath);
    const reader = videoResponse.body?.getReader();
    if (!reader) throw new Error("No response body");

    await new Promise<void>((resolve, reject) => {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) nodeWriteStream.write(value);
          }
          nodeWriteStream.end();
          nodeWriteStream.on("finish", resolve);
          nodeWriteStream.on("error", reject);
        } catch (e) { reject(e); }
      };
      void pump();
    });

    // Process with FFmpeg
    const ffmpegModule = await import("fluent-ffmpeg");
    const ffmpeg = ffmpegModule.default;
    const ffmpegStaticModule = await import("ffmpeg-static");
    const ffmpegPath = ffmpegStaticModule.default as string | null;
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

    const codecMap: Record<string, string> = {
      mp3: "libmp3lame",
      wav: "pcm_s16le",
      aac: "aac",
    };

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(inputPath)
        .noVideo()
        .audioCodec(codecMap[format] ?? "libmp3lame")
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err));

      if (format !== "wav") cmd.audioBitrate("192k");
      cmd.run();
    });

    // Read output file
    const fsSync = await import("fs");
    const audioBuffer = fsSync.readFileSync(outputPath);
    const base64Audio = audioBuffer.toString("base64");
    const mimeType = MIME_TYPES[format] ?? "audio/mpeg";
    const dataUrl = `data:${mimeType};base64,${base64Audio}`;

    // Cleanup temp files
    try { unlinkSync(inputPath); } catch {}
    try { unlinkSync(outputPath); } catch {}

    // Gemini Audio Transcription
    let transcription: string | null = null;
    if (transcribeWithGemini) {
      try {
        const { transcribeAudio } = await import("@/lib/gemini-nodes");
        transcription = await transcribeAudio(base64Audio, mimeType);
      } catch (geminiErr) {
        console.error("Gemini transcription failed:", geminiErr);
        // Non-fatal
      }
    }

    return NextResponse.json({ outputUrl: dataUrl, format, transcription });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Audio extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
