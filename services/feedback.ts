import type {
  FeedbackSubmitRequest,
  FeedbackSubmitResponse,
} from "@/types/support";

type RequestOptions = {
  signal?: AbortSignal;
};

function isFeedbackSubmitResponse(
  value: unknown,
): value is FeedbackSubmitResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as {
    resultCode?: unknown;
    feebackId?: unknown;
    feedbackId?: unknown;
  };

  if (typeof candidate.resultCode !== "string") return false;

  const rawId = candidate.feedbackId ?? candidate.feebackId;
  return rawId == null || Number.isFinite(rawId);
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const withError = payload as {
    error?: unknown;
    detail?: unknown;
    message?: unknown;
  };

  for (const value of [withError.error, withError.detail, withError.message]) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

export async function submitFeedback(
  input: FeedbackSubmitRequest,
  options?: RequestOptions,
) {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: options?.signal,
  });

  const payload = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    throw new Error(
      getErrorMessage(
        payload,
        `의견 제출에 실패했어요. 잠시 후 다시 시도해 주세요. (HTTP ${res.status})`,
      ),
    );
  }

  if (!isFeedbackSubmitResponse(payload)) {
    throw new Error("의견 제출 응답 형식이 올바르지 않아요.");
  }

  return payload;
}
