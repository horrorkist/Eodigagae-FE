import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_FACILITY_API_BASE_URL } from "@/lib/facilityProxy";
import type { FeedbackSubmitRequest } from "@/types/support";

export const runtime = "nodejs";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

function parseFeedbackRequest(value: unknown): ParseResult<FeedbackSubmitRequest> {
  if (!isRecord(value)) {
    return { ok: false, message: "요청 본문이 올바르지 않아요." };
  }

  const satisfactionScore = Number(value.satisfactionScore);
  if (
    !Number.isInteger(satisfactionScore) ||
    satisfactionScore < 1 ||
    satisfactionScore > 5
  ) {
    return {
      ok: false,
      message: "satisfactionScore는 1부터 5 사이의 정수여야 해요.",
    };
  }

  if (typeof value.hasError !== "boolean") {
    return { ok: false, message: "hasError는 boolean이어야 해요." };
  }

  const errorDetail = toTrimmedString(value.errorDetail);
  if (errorDetail == null) {
    return { ok: false, message: "errorDetail은 문자열이어야 해요." };
  }

  const content = toTrimmedString(value.content);
  if (content == null) {
    return { ok: false, message: "content는 문자열이어야 해요." };
  }

  return {
    ok: true,
    value: {
      satisfactionScore,
      hasError: value.hasError,
      errorDetail: value.hasError ? errorDetail : "",
      content,
    },
  };
}

function getBaseUrl() {
  return (
    process.env.FEEDBACK_API_BASE_URL ??
    process.env.FACILITY_API_BASE_URL ??
    DEFAULT_FACILITY_API_BASE_URL
  );
}

function getUpstreamErrorMessage(payload: unknown, status: number) {
  if (isRecord(payload)) {
    for (const key of ["error", "detail", "message"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return `Feedback request failed with HTTP ${status}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseFeedbackRequest(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const upstreamUrl = new URL("/api/v1/feedback", getBaseUrl());

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed.value),
    });

    const text = await upstream.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        return NextResponse.json(
          {
            error: "Feedback upstream returned non-JSON payload",
            detail: text,
          },
          { status: 502 },
        );
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: getUpstreamErrorMessage(payload, upstream.status),
          detail: payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch feedback upstream";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
