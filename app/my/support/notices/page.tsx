import Link from "next/link";
import { listNotices } from "@/lib/mock/notices";

export default function SupportNoticesPage() {
  const notices = listNotices();

  return (
    <div className="min-h-full bg-gray-50 pointer-events-auto">
      <section className="mx-auto max-w-[430px] px-4 pt-5 pb-24 space-y-4">
        <div className="space-y-2">
          <Link href="/my" className="inline-flex text-sm text-gray-500">
            ← 마이페이지
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">공지사항</h1>
        </div>

        <div className="space-y-2">
          {notices.map((notice) => (
            <Link
              key={notice.id}
              href={`/my/support/notices/${notice.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50"
            >
              <p className="text-xs text-gray-500">{notice.publishedAt}</p>
              <h2 className="mt-1 text-sm font-semibold text-gray-900">
                {notice.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{notice.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
