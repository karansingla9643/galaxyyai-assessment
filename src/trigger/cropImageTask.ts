import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import sharp from "sharp";
import { uploadBufferToSupabase } from "@/lib/transloadit";

const CropImagePayload = z.object({
  nodeRunId: z.string(),
  workflowRunId: z.string(),
  imageUrl: z.string(),
  xPosition: z.number().min(0).max(100).default(0),
  yPosition: z.number().min(0).max(100).default(0),
  width: z.number().min(0).max(100).default(100),
  height: z.number().min(0).max(100).default(100),
});

export type CropImagePayloadType = z.infer<typeof CropImagePayload>;

async function fetchBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 120, // 2 minutes
  run: async (payload: CropImagePayloadType) => {
    const { nodeRunId, workflowRunId, imageUrl, xPosition, yPosition, width, height } = payload;

    logger.info("Starting crop-image task", { nodeRunId, workflowRunId });

    // Fetch the source image
    const buf = await fetchBuffer(imageUrl);

    // Get dimensions
    const img = sharp(buf);
    const meta = await img.metadata();
    const imgW = meta.width ?? 1920;
    const imgH = meta.height ?? 1080;

    // Calculate pixel coords from percentages
    const cropX = Math.max(0, Math.floor((xPosition / 100) * imgW));
    const cropY = Math.max(0, Math.floor((yPosition / 100) * imgH));
    const cropW = Math.max(1, Math.min(Math.floor((width / 100) * imgW), imgW - cropX));
    const cropH = Math.max(1, Math.min(Math.floor((height / 100) * imgH), imgH - cropY));

    logger.info("Crop parameters", { cropX, cropY, cropW, cropH, imgW, imgH });

    // Perform the crop
    const cropped = await sharp(buf)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    logger.info("Crop complete", { outputSize: cropped.length });

    // Upload to Supabase via Transloadit Template — get permanent URL
    const supabaseUrl = await uploadBufferToSupabase(
      cropped,
      `cropped-${nodeRunId}.jpg`,
      "image/jpeg"
    );

    let outputUrl: string;
    if (supabaseUrl) {
      logger.info("Uploaded to Supabase via Transloadit", { url: supabaseUrl });
      outputUrl = supabaseUrl;
    } else {
      // Fallback to base64 data URL if Transloadit/Supabase not configured
      outputUrl = `data:image/jpeg;base64,${cropped.toString("base64")}`;
      logger.warn("Transloadit/Supabase not configured — using base64 fallback", {
        length: outputUrl.length,
      });
    }

    return {
      outputUrl,
      nodeRunId,
      workflowRunId,
      provider: supabaseUrl ? "supabase" : "base64",
      cropParams: { xPosition, yPosition, width, height, cropX, cropY, cropW, cropH },
    };
  },
});
