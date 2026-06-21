import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export const maxDuration = 60;

/**
 * POST /api/upload-image
 * Accepts: multipart/form-data with a "file" field (image)
 * Returns: { url: string } — the Transloadit CDN URL
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";

  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit credentials not configured" }, { status: 500 });
  }

  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const params = JSON.stringify({
    auth: { key: authKey, expires },
    steps: {
      ":original": { robot: "/upload/handle", result: true },
      resized: {
        use: ":original",
        robot: "/image/resize",
        width: 2048,
        height: 2048,
        resize_strategy: "fit",
        result: true,
      },
    },
  });

  const signature = `sha384:${crypto
    .createHmac("sha384", authSecret)
    .update(params)
    .digest("hex")}`;

  // Build multipart form — pass the File directly (works in Node 18+)
  const tld = new FormData();
  tld.append("params", params);
  tld.append("signature", signature);
  tld.append("file", file, file.name);

  const res = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: tld,
  });

  const result = await res.json() as {
    ok?: string;
    results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
    error?: string;
    message?: string;
  };

  if (result.error) {
    console.error("[upload] Transloadit error:", result.error, result.message);
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: 400 }
    );
  }

  const files = Object.values(result.results ?? {}).flat();
  const url = files[0]?.ssl_url ?? files[0]?.url;

  if (!url) {
    return NextResponse.json({ error: "No URL returned from Transloadit" }, { status: 500 });
  }

  return NextResponse.json({ url, provider: "transloadit" });
}
