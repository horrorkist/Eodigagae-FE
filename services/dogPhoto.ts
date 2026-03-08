type DirectUploadResponse = {
  imageId: string;
  uploadURL: string;
  variantUrl?: string;
};

const PENDING_DOG_PHOTO_DELETE_STORAGE_KEY = "dog:photo:pending-delete:v1";

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

function toDeleteLogError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { message: String(error) };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeImageId(imageId: string): string {
  return imageId.trim();
}

function readPendingDogPhotoDeleteIds(): string[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(PENDING_DOG_PHOTO_DELETE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } catch (error) {
    console.error("dog-photo-delete-queue-read-failed", {
      error: toDeleteLogError(error),
    });
    return [];
  }
}

function writePendingDogPhotoDeleteIds(imageIds: string[]) {
  if (!canUseStorage()) return;

  const next = Array.from(
    new Set(imageIds.map((item) => item.trim()).filter(Boolean)),
  );

  try {
    if (next.length === 0) {
      localStorage.removeItem(PENDING_DOG_PHOTO_DELETE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      PENDING_DOG_PHOTO_DELETE_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch (error) {
    console.error("dog-photo-delete-queue-write-failed", {
      error: toDeleteLogError(error),
    });
  }
}

function removePendingDogPhotoDelete(imageId: string) {
  const normalizedImageId = normalizeImageId(imageId);
  if (!normalizedImageId) return;

  const pending = readPendingDogPhotoDeleteIds();
  if (pending.length === 0) return;

  const next = pending.filter((item) => item !== normalizedImageId);
  if (next.length === pending.length) return;
  writePendingDogPhotoDeleteIds(next);
}

export function enqueuePendingDogPhotoDelete(imageId: string) {
  const normalizedImageId = normalizeImageId(imageId);
  if (!normalizedImageId) return;

  const pending = readPendingDogPhotoDeleteIds();
  if (pending.includes(normalizedImageId)) return;
  writePendingDogPhotoDeleteIds([...pending, normalizedImageId]);
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

type DeleteDogPhotoOptions = {
  context?: string;
};

export async function deleteDogPhoto(
  imageId: string,
  options?: DeleteDogPhotoOptions,
): Promise<void> {
  const normalizedImageId = normalizeImageId(imageId);
  if (!normalizedImageId) return;
  const context = options?.context ?? "unknown";

  const response = await fetch(`/api/images/${encodeURIComponent(normalizedImageId)}`, {
    method: "DELETE",
  });
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; error?: string; detail?: string }
    | null;

  if (!response.ok || payload?.success !== true) {
    const reason = getErrorMessage(payload, "사진 삭제에 실패했어요.");
    const error = new Error(reason);
    console.error("dog-photo-delete-failed", {
      context,
      imageId: normalizedImageId,
      error: toDeleteLogError(error),
    });
    throw error;
  }

  removePendingDogPhotoDelete(normalizedImageId);
  console.info("dog-photo-delete-succeeded", {
    context,
    imageId: normalizedImageId,
  });
}

export async function deleteDogPhotoWithFallbackQueue(
  imageId: string,
  options?: DeleteDogPhotoOptions,
): Promise<void> {
  const normalizedImageId = normalizeImageId(imageId);
  if (!normalizedImageId) return;
  const context = options?.context ?? "unknown";

  try {
    await deleteDogPhoto(normalizedImageId, { context });
  } catch (error) {
    enqueuePendingDogPhotoDelete(normalizedImageId);
    console.error("dog-photo-delete-enqueued", {
      context,
      imageId: normalizedImageId,
      error: toDeleteLogError(error),
    });
  }
}

export async function drainPendingDogPhotoDeletes(options?: {
  context?: string;
}): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  remaining: number;
}> {
  const context = options?.context ?? "unknown";
  const pending = readPendingDogPhotoDeleteIds();
  if (pending.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, remaining: 0 };
  }

  const failed: string[] = [];

  for (const imageId of pending) {
    try {
      await deleteDogPhoto(imageId, { context });
    } catch {
      failed.push(imageId);
    }
  }

  writePendingDogPhotoDeleteIds(failed);

  const result = {
    attempted: pending.length,
    succeeded: pending.length - failed.length,
    failed: failed.length,
    remaining: failed.length,
  };

  console.info("dog-photo-delete-drain-finished", {
    context,
    ...result,
  });

  return result;
}
