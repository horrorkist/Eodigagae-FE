import { NextResponse } from "next/server";
import { createDirectUploadUrl } from "@/lib/cloudflare/images.server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await createDirectUploadUrl({
      metadata: {
        source: "my-pet-profile",
        createdAt: new Date().toISOString(),
      },
      requireSignedURLs: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create direct upload URL", detail: message },
      { status: 500 },
    );
  }
}
