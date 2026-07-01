import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

export const maxDuration = 120;

/**
 * POST /api/upload-image
 * Accepts: multipart/form-data with a "file" field (image)
 * Returns: { url: string } — permanent Supabase URL via Transloadit Template
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const authSecret = process.env.TRANSLOADIT_SECRET ?? "";
  const templateId = process.env.TRANSLOADIT_TEMPLATE_ID ?? "";

  if (!authKey || !authSecret || !templateId) {
    return NextResponse.json({ error: "Transloadit credentials not configured" }, { status: 500 });
  }

  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // Use the Template — it handles upload + Supabase store steps
  const params = JSON.stringify({
    auth: { key: authKey, expires },
    template_id: templateId,
  });

  const signature = `sha384:${crypto
    .createHmac("sha384", authSecret)
    .update(params)
    .digest("hex")}`;

  const tld = new FormData();
  tld.append("params", params);
  tld.append("signature", signature);
  tld.append("file", file, file.name);

  // ?wait=true — block until assembly is fully complete (Supabase store done)
  const res = await fetch("https://api2.transloadit.com/assemblies?wait=true", {
    method: "POST",
    body: tld,
  });
  console.log("res", res)
  const result = await res.json() as {
    ok?: string;
    results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
    error?: string;
    message?: string;
  };

  if (result.error) {
    console.error("[upload-image] Transloadit error:", result.error, result.message);
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: 400 }
    );
  }

  // ── Strategy 1: results key (works when store step has "result": true in template) ──
  const allResultFiles = Object.values(result.results ?? {}).flat();
  const urlFromResults =
    allResultFiles.find((f) => f.ssl_url?.includes("supabase.co"))?.ssl_url ??
    allResultFiles.find((f) => f.ssl_url)?.ssl_url ??
    allResultFiles.find((f) => f.url?.includes("supabase.co"))?.url ??
    allResultFiles.find((f) => f.url)?.url;

  if (urlFromResults) {
    return NextResponse.json({ url: urlFromResults, provider: "supabase" });
  }

  // ── Strategy 2: uploads array (original files, sometimes has Supabase URL) ──
  const raw = result as unknown as {
    assembly_id?: string;
    uploads?: Array<{ ssl_url?: string; url?: string; url_name?: string; name?: string }>;
  };
  const uploadFiles = raw.uploads ?? [];
  const urlFromUploads =
    uploadFiles.find((f) => f.ssl_url?.includes("supabase.co"))?.ssl_url ??
    uploadFiles.find((f) => f.url?.includes("supabase.co"))?.url;

  if (urlFromUploads) {
    return NextResponse.json({ url: urlFromUploads, provider: "supabase" });
  }

  // ── Strategy 3: Reconstruct the Supabase public URL from assembly metadata ──
  // Transloadit's ${unique_prefix} = assemblyId[0..1] + "/" + assemblyId[2..]
  // The store path in the template should be: <base>/${unique_prefix}/${file.url_name}
  const assemblyId = raw.assembly_id ?? "";
  const firstUpload = uploadFiles[0];

  if (assemblyId && firstUpload) {
    const urlName = firstUpload.url_name ?? firstUpload.name ?? file.name;
    const uniquePrefix = `${assemblyId.slice(0, 2)}/${assemblyId.slice(2)}`;
    // Derive public Supabase host from S3 endpoint env:
    // https://[project].storage.supabase.co/storage/v1/s3 → [project].supabase.co
    const s3Endpoint = process.env.SUPABASE_BASE_S3_ENDPOINT ?? "";
    const projectRef = s3Endpoint.match(/https:\/\/([^.]+)\.storage\.supabase\.co/)?.[1];
    const bucket = process.env.SUPABASE_BASE_S3_BUCKET_NAME ?? "";
    // Base folder used in the template path (e.g. "uploads" or "inputs")
    const pathBase = process.env.TRANSLOADIT_SUPABASE_PATH ?? "uploads";

    if (projectRef && bucket) {
      const supabaseUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${pathBase}/${uniquePrefix}/${urlName}`;
      return NextResponse.json({ url: supabaseUrl, provider: "supabase" });
    }
  }

  // Nothing worked — log the full result for debugging
  console.error("[upload-image] Could not extract URL. Full result:", JSON.stringify(result));
  return NextResponse.json(
    { error: "No permanent URL returned from Transloadit" },
    { status: 500 }
  );
}
