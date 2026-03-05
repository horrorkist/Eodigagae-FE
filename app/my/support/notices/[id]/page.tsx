import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoticeById } from "@/lib/mock/notices";

type NoticeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const resolvedParams = await params;
  const notice = getNoticeById(resolvedParams.id);
  if (!notice) notFound();

  return (
    <div className="min-h-full bg-gray-50 pointer-events-auto">
      <section className="mx-auto max-w-[430px] px-4 pt-5 pb-24 space-y-4">
        <div className="space-y-2">
          <Link
            href="/my/support/notices"
            className="inline-flex text-sm text-gray-500"
          >
            ← 공지사항
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">{notice.title}</h1>
          <p className="text-xs text-gray-500">{notice.publishedAt}</p>
        </div>

        <article className="rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
          {notice.content}
        </article>
      </section>
    </div>
  );
}
