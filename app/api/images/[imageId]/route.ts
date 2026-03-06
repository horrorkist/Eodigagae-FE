import { NextResponse } from "next/server";
import { deleteImage } from "@/lib/cloudflare/images.server";

export const runtime = "nodejs";

type DeleteImageRouteContext = {
  params: Promise<{ imageId: string }>;
};

export async function DELETE(
  _request: Request,
  context: DeleteImageRouteContext,
) {
  const resolvedParams = await context.params;
  const decodedImageId = decodeURIComponent(resolvedParams.imageId ?? "").trim();

  if (!decodedImageId) {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  try {
    await deleteImage(decodedImageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete image", detail: message },
      { status: 500 },
    );
  }
}
