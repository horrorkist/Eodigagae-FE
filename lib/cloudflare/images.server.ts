type CloudflareImagesEnv = {
  accountId: string;
  apiToken: string;
  deliveryHash: string;
  variant: string;
};

type CloudflareApiEnvelope<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result?: T;
};

type DirectUploadResult = {
  id: string;
  uploadURL: string;
};

function getCloudflareImagesEnv(): CloudflareImagesEnv {
  const accountId = process.env.CF_IMAGES_ACCOUNT_ID?.trim();
  const apiToken = process.env.CF_IMAGES_API_TOKEN?.trim();
  const deliveryHash = process.env.CF_IMAGES_DELIVERY_HASH?.trim();
  const variant = process.env.CF_IMAGES_VARIANT?.trim() || "public";

  if (!accountId || !apiToken || !deliveryHash) {
    throw new Error(
      "Cloudflare Images env missing (CF_IMAGES_ACCOUNT_ID / CF_IMAGES_API_TOKEN / CF_IMAGES_DELIVERY_HASH)",
    );
  }

  return { accountId, apiToken, deliveryHash, variant };
}

function toVariantUrl(env: CloudflareImagesEnv, imageId: string): string {
  return `https://imagedelivery.net/${env.deliveryHash}/${imageId}/${env.variant}`;
}

async function fetchCloudflareApi<T>(
  env: CloudflareImagesEnv,
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.accountId}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${env.apiToken}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | CloudflareApiEnvelope<T>
    | null;

  if (!response.ok || !payload?.success || !payload.result) {
    const detail = payload?.errors?.[0]?.message ?? response.statusText;
    throw new Error(`Cloudflare Images API error: ${detail}`);
  }

  return payload.result;
}

export async function createDirectUploadUrl(options?: {
  metadata?: Record<string, unknown>;
  requireSignedURLs?: boolean;
}): Promise<{ imageId: string; uploadURL: string; variantUrl: string }> {
  const env = getCloudflareImagesEnv();
  const form = new FormData();

  if (typeof options?.requireSignedURLs === "boolean") {
    form.set("requireSignedURLs", String(options.requireSignedURLs));
  } else {
    form.set("requireSignedURLs", "false");
  }

  if (options?.metadata) {
    form.set("metadata", JSON.stringify(options.metadata));
  }

  const result = await fetchCloudflareApi<DirectUploadResult>(
    env,
    "/images/v2/direct_upload",
    {
      method: "POST",
      body: form,
    },
  );

  return {
    imageId: result.id,
    uploadURL: result.uploadURL,
    variantUrl: toVariantUrl(env, result.id),
  };
}

export async function deleteImage(imageId: string): Promise<void> {
  const env = getCloudflareImagesEnv();
  const normalizedImageId = imageId.trim();
  if (!normalizedImageId) {
    throw new Error("imageId is required");
  }

  await fetchCloudflareApi<unknown>(
    env,
    `/images/v1/${encodeURIComponent(normalizedImageId)}`,
    {
      method: "DELETE",
    },
  );
}
