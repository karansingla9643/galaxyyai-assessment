import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CropImagePayload = z.object({
  imageUrl: z.string(),
  xPosition: z.number().min(0).max(100).default(0),
  yPosition: z.number().min(0).max(100).default(0),
  width: z.number().min(1).max(100).default(100),
  height: z.number().min(1).max(100).default(100),
  analyzeWithGemini: z.boolean().default(true),
});

async function loadSharp(): Promise<(input: Buffer) => import("sharp").Sharp> {
  const sharpModule = await import("sharp");
  const fn = (sharpModule as unknown as { default: (b: Buffer) => import("sharp").Sharp }).default;
  return fn;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CropImagePayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { imageUrl, xPosition, yPosition, width, height, analyzeWithGemini } = parsed.data;

  try {
    const sharp = await loadSharp();

    let buffer: Buffer;
    let mimeType = "image/jpeg";

    if (imageUrl.startsWith("data:")) {
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid data URL");
      mimeType = match[1];
      buffer = Buffer.from(match[2], "base64");
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const ct = response.headers.get("content-type");
      if (ct) mimeType = ct.split(";")[0];
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const image = sharp(buffer);
    const metadata = await image.metadata();
    const imgW = metadata.width ?? 1920;
    const imgH = metadata.height ?? 1080;

    const cropX = Math.floor((xPosition / 100) * imgW);
    const cropY = Math.floor((yPosition / 100) * imgH);
    const cropW = Math.max(1, Math.floor((width / 100) * imgW));
    const cropH = Math.max(1, Math.floor((height / 100) * imgH));

    // ⚠️ MANDATORY 30s delay (spec requirement)
    await new Promise((r) => setTimeout(r, 30000));

    const croppedBuffer = await sharp(buffer)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    const croppedBase64 = croppedBuffer.toString("base64");
    const outputUrl = `data:image/jpeg;base64,${croppedBase64}`;

    // Gemini Vision Analysis
    let geminiAnalysis: string | null = null;
    if (analyzeWithGemini) {
      try {
        const { analyzeImage } = await import("@/lib/gemini-nodes");
        geminiAnalysis = await analyzeImage(croppedBase64, "image/jpeg");
      } catch (geminiErr) {
        console.error("Gemini analysis failed:", geminiErr);
        // Non-fatal — crop still succeeds
      }
    }

    return NextResponse.json({
      outputUrl,
      geminiAnalysis,
      dimensions: { x: cropX, y: cropY, width: cropW, height: cropH },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Crop failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
