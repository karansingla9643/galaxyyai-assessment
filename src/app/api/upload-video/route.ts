import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const allowedTypes = [
      "video/mp4", "video/quicktime", "video/x-msvideo",
      "video/webm", "video/x-matroska", "video/mpeg",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Supported: MP4, MOV, AVI, WebM, MKV" }, { status: 400 });
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
    const authSecret = process.env.TRANSLOADIT_SECRET ?? "";

    if (!authKey || !authSecret || authKey === "REPLACE_ME") {
      // Dev fallback — return a blob URL placeholder
      return NextResponse.json({
        url: `data:${file.type};placeholder,${file.name}`,
        name: file.name,
        size: file.size,
      });
    }

    const crypto = await import("crypto");
    const params = JSON.stringify({
      auth: {
        key: authKey,
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      steps: {
        ":original": { robot: "/upload/handle", result: true },
      },
    });

    const signature = `sha384:${crypto
      .createHmac("sha384", authSecret)
      .update(params)
      .digest("hex")}`;

    const uploadForm = new FormData();
    uploadForm.append("params", params);
    uploadForm.append("signature", signature);
    uploadForm.append("file", file);

    const res = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: uploadForm,
    });

    const result = await res.json() as {
      results?: Record<string, Array<{ ssl_url?: string }>>;
      error?: string;
    };

    if (result.error) throw new Error(result.error);

    const files = Object.values(result.results ?? {}).flat();
    const url = files[0]?.ssl_url;
    if (!url) throw new Error("No upload URL returned");

    return NextResponse.json({ url, name: file.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
