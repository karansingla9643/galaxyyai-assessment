import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateTransloaditParams } from "@/lib/transloadit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { params, signature } = generateTransloaditParams();

  return NextResponse.json({
    authKey: process.env.NEXT_PUBLIC_TRANSLOADIT_KEY,
    params,
    signature,
  });
}
