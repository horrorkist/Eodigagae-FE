type DirectUploadResponse = {
  imageId: string;
  uploadURL: string;
  variantUrl?: string;
};

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export function buildVariantUrl(imageId: string): string {
  const deliveryHash = process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_HASH?.trim();
  const variant = process.env.NEXT_PUBLIC_CF_IMAGES_VARIANT?.trim() || "public";

  if (!deliveryHash) {
    throw new Error(
      "NEXT_PUBLIC_CF_IMAGES_DELIVERY_HASH is missing and variantUrl was not returned by API",
    );
  }

  return `https://imagedelivery.net/${deliveryHash}/${imageId}/${variant}`;
}

export async function requestDirectUpload(): Promise<{
  imageId: string;
  uploadURL: string;
  variantUrl: string;
}> {
  const response = await fetch("/api/images/direct-upload", {
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | DirectUploadResponse
    | { error?: string; detail?: string }
    | null;

  if (!response.ok || !payload || !("imageId" in payload) || !("uploadURL" in payload)) {
    throw new Error(getErrorMessage(payload, "업로드 URL 발급에 실패했어요."));
  }

  return {
    imageId: payload.imageId,
    uploadURL: payload.uploadURL,
    variantUrl: payload.variantUrl || buildVariantUrl(payload.imageId),
  };
}

export async function uploadFileToDirectUrl(
  uploadURL: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.set("file", file);

  const response = await fetch(uploadURL, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error("사진 업로드에 실패했어요.");
  }
}

export async function deleteDogPhoto(imageId: string): Promise<void> {
  const response = await fetch(`/api/images/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string; detail?: string }
    | null;

  if (!response.ok || payload?.success !== true) {
    throw new Error(getErrorMessage(payload, "사진 삭제에 실패했어요."));
  }
}
