import { Suspense } from "react";
import SearchPageClient from "./SearchPageClient";

function SearchFallback() {
  return (
    <div className="flex min-h-full flex-col bg-gray-50 px-5 pt-3 pointer-events-auto">
      <section className="mx-auto w-full max-w-[430px] px-1 pb-24 pt-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          검색 화면을 준비 중입니다...
        </div>
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageClient />
    </Suspense>
  );
}
