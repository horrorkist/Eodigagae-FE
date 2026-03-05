"use client";

import Link from "next/link";
import { useState } from "react";
import { useModalStore } from "@/stores/modal";
import type { SupportReportDraft } from "@/types/support";

const ISSUE_OPTIONS: SupportReportDraft["issueType"][] = [
  "주소오류",
  "폐업",
  "정보불일치",
  "기타",
];

const INITIAL_FORM: SupportReportDraft = {
  locationName: "",
  issueType: "주소오류",
  description: "",
  contact: "",
};

export default function SupportReportPage() {
  const [form, setForm] = useState<SupportReportDraft>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const openModal = useModalStore((s) => s.open);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const locationName = form.locationName.trim();
    const description = form.description.trim();

    if (!locationName || !description) {
      setError("장소명과 내용을 입력해 주세요.");
      return;
    }

    setError(null);
    openModal({
      title: "신고를 접수했어요",
      body: <p>소중한 제보 감사합니다. 더 정확한 정보를 제공하도록 점검할게요.</p>,
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
          <h1 className="text-lg font-semibold text-gray-900">잘못된 정보 신고</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="space-y-1">
            <label htmlFor="report-location" className="text-sm font-medium text-gray-900">
              장소명
            </label>
            <input
              id="report-location"
              value={form.locationName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, locationName: e.target.value }))
              }
              placeholder="예: 어디가개 카페"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="report-type" className="text-sm font-medium text-gray-900">
              신고 유형
            </label>
            <select
              id="report-type"
              value={form.issueType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  issueType: e.target.value as SupportReportDraft["issueType"],
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            >
              {ISSUE_OPTIONS.map((issueType) => (
                <option key={issueType} value={issueType}>
                  {issueType}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="report-description" className="text-sm font-medium text-gray-900">
              상세 내용
            </label>
            <textarea
              id="report-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="어떤 정보가 잘못되었는지 알려주세요."
              className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dg-green-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="report-contact" className="text-sm font-medium text-gray-900">
              연락처 (선택)
            </label>
            <input
              id="report-contact"
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
            신고하기
          </button>
        </form>
      </section>
    </div>
  );
}
