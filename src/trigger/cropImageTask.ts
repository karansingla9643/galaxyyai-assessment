import { task, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import sharp from "sharp";
import crypto from "crypto";

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

async function uploadToTransloadit(buffer: Buffer, filename: string): Promise<string | null> {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";

  if (!authKey || !authSecret || authKey === "galaxyaitest") {
    logger.warn("Transloadit not configured — using base64 fallback");
    return null;
  }

  try {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const params = JSON.stringify({
      auth: { key: authKey, expires },
      steps: {
        ":original": { robot: "/upload/handle", result: true },
      },
    });

    const signature = `sha384:${crypto
      .createHmac("sha384", authSecret)
      .update(params)
      .digest("hex")}`;

    // Use FormData via Blob (Trigger.dev runs Node 18+)
    const fd = new FormData();
    fd.append("params", params);
    fd.append("signature", signature);
    fd.append("file", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), filename);

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: fd,
    });
    const result = await res.json() as {
      ok?: string;
      results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
      error?: string;
    };

    if (result.error) {
      logger.warn("Transloadit upload failed", { error: result.error });
      return null;
    }

    const files = Object.values(result.results ?? {}).flat();
    const url = files[0]?.ssl_url ?? files[0]?.url;
    return url ?? null;
  } catch (e) {
    logger.warn("Transloadit upload error", { error: e });
    return null;
  }
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

    // Try Transloadit upload first
    const transloaditUrl = await uploadToTransloadit(cropped, `cropped-${nodeRunId}.jpg`);

    let outputUrl: string;
    if (transloaditUrl) {
      logger.info("Uploaded to Transloadit", { url: transloaditUrl });
      outputUrl = transloaditUrl;
    } else {
      // Fallback to base64 data URL
      outputUrl = `data:image/jpeg;base64,${cropped.toString("base64")}`;
      logger.info("Using base64 fallback", { length: outputUrl.length });
    }

    return {
      outputUrl,
      nodeRunId,
      workflowRunId,
      provider: transloaditUrl ? "transloadit" : "base64",
      cropParams: { xPosition, yPosition, width, height, cropX, cropY, cropW, cropH },
    };
  },
});
