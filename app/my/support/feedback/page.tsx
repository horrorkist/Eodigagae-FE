"use client";

import Link from "next/link";
import { useState } from "react";
import { useModalStore } from "@/stores/modal";
import type { SupportFeedbackDraft } from "@/types/support";

const CATEGORY_OPTIONS: SupportFeedbackDraft["category"][] = [
  "기능제안",
  "사용성",
  "버그",
  "기타",
];

const INITIAL_FORM: SupportFeedbackDraft = {
  category: "기능제안",
  message: "",
  contact: "",
};

export default function SupportFeedbackPage() {
  const [form, setForm] = useState<SupportFeedbackDraft>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const openModal = useModalStore((s) => s.open);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = form.message.trim();
    if (!message) {
      setError("의견 내용을 입력해 주세요.");
      return;
    }

    setError(null);
    openModal({
      title: "의견을 남겼어요",
      body: <p>소중한 의견 감사합니다. 더 나은 서비스에 반영할게요.</p>,
      confirmLabel: "확인",
    });
    setForm(INITIAL_FORM);
  };

  return (
    <div className="min-h-full bg-gray-50 pointer-events-auto">
      <section className="mx-auto max-w-[430px] px-4 pt-5 pb-24 space-y-4">
        <div className="space-y-2">
          <Link href="/my" className="inline-flex text-sm text-gray-500">
            ← 마이페이지
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">의견 남기기</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="space-y-1">
            <label
              htmlFor="feedback-category"
              className="text-sm font-medium text-gray-900"
            >
              의견 유형
            </label>
            <select
              id="feedback-category"
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  category: e.target.value as SupportFeedbackDraft["category"],
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="feedback-message"
              className="text-sm font-medium text-gray-900"
            >
              의견 내용
            </label>
            <textarea
              id="feedback-message"
              value={form.message}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="개선되면 좋겠는 점을 자유롭게 남겨주세요."
              className="min-h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="feedback-contact"
              className="text-sm font-medium text-gray-900"
            >
              연락처 (선택)
            </label>
            <input
              id="feedback-contact"
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
              placeholder="이메일 또는 전화번호"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            />
          </div>

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-dg-green-500 text-sm font-semibold text-white active:bg-dg-green-600"
          >
            의견 보내기
          </button>
        </form>
      </section>
    </div>
  );
}
