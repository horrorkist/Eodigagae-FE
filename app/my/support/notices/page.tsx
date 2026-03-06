"use client";

import { useState } from "react";
import AppIcon from "@/components/icons/AppIcon";
import { appIconChevronDown } from "@/components/icons/definitions.generated";
import { listNotices } from "@/lib/mock/notices";

export default function SupportNoticesPage() {
  const notices = listNotices();
  const [openNoticeId, setOpenNoticeId] = useState<string | null>(null);

  if (notices.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-dg-gray-500">
        아직 등록된 공지가 없어요
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notices.map((notice) => {
        const isOpen = openNoticeId === notice.id;
        const panelId = `notice-panel-${notice.id}`;
        const triggerId = `notice-trigger-${notice.id}`;

        return (
          <div key={notice.id} className="overflow-hidden rounded-xl bg-white">
            <button
              id={triggerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() =>
                setOpenNoticeId((prev) =>
                  prev === notice.id ? null : notice.id,
                )
              }
              className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left"
            >
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">
                  {notice.title}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {notice.publishedAt}
                </p>
              </div>
              <AppIcon
                icon={appIconChevronDown}
                className={[
                  "mt-1 h-3.5 w-3.5 shrink-0 text-dg-gray-500 transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                ].join(" ")}
              />
            </button>

            <div
              className={[
                "grid transition-[grid-template-rows] duration-200 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              ].join(" ")}
            >
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="overflow-hidden"
              >
                <div
                  className={[
                    "px-4 pb-4 pt-1 transition-all duration-200 ease-out",
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-1 opacity-0",
                  ].join(" ")}
                >
                  {/* <p className="text-sm text-gray-600">{notice.summary}</p> */}
                  <p className="text-sm leading-6 text-dg-gray-700">
                    {notice.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
