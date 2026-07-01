import crypto from "crypto";

/** Build signed params using the Transloadit Template (no inline steps). */
export function generateTransloaditParams() {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";
  const templateId = process.env.TRANSLOADIT_TEMPLATE_ID ?? "";

  const params = {
    auth: {
      key: authKey,
      expires: new Date(Date.now() + 60 * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}Z$/, "+00:00"),
    },
    template_id: templateId,
  };

  const paramsString = JSON.stringify(params);
  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(paramsString)
    .digest("hex");

  return {
    params: paramsString,
    signature: `sha384:${signature}`,
  };
}

/**
 * Upload a file Buffer to Transloadit via the configured Template,
 * wait for the assembly to complete, and return the permanent Supabase URL
 * from the "stored" step. Returns null on failure.
 */
export async function uploadBufferToSupabase(
  buffer: Buffer,
  filename: string,
  mimeType = "image/jpeg"
): Promise<string | null> {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";
  const templateId = process.env.TRANSLOADIT_TEMPLATE_ID ?? "";

  if (!authKey || !authSecret || !templateId) return null;

  try {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const params = JSON.stringify({
      auth: { key: authKey, expires },
      template_id: templateId,
    });

    const signature = `sha384:${crypto
      .createHmac("sha384", authSecret)
      .update(params)
      .digest("hex")}`;

    const fd = new FormData();
    fd.append("params", params);
    fd.append("signature", signature);
    fd.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

    // ?wait=true blocks until the assembly (including Supabase store) is done.
    // AbortController gives up after 25s so we never hang a serverless function.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000);

    let res: Response;
    try {
      res = await fetch("https://api2.transloadit.com/assemblies?wait=true", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const result = await res.json() as {
      ok?: string;
      results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
      error?: string;
      message?: string;
    };

    if (result.error) return null;

    // Scan all step results — prefer any Supabase URL, fall back to any ssl_url.
    // This is resilient to whatever step name the template uses.
    const allFiles = Object.values(result.results ?? {}).flat();
    const url =
      allFiles.find((f) => f.ssl_url?.includes("supabase.co"))?.ssl_url ??
      allFiles.find((f) => f.ssl_url)?.ssl_url ??
      allFiles.find((f) => f.url?.includes("supabase.co"))?.url ??
      allFiles.find((f) => f.url)?.url ??
      null;
    return url;
  } catch {
    return null;
  }
}

