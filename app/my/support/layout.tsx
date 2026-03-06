"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/icons/AppIcon";
import { appIconChevronRight } from "@/components/icons/definitions.generated";

type SupportHeaderConfig = {
  label: string;
  backHref: string;
};

function getSupportHeaderConfig(pathname: string): SupportHeaderConfig {
  if (pathname === "/my/support/notices") {
    return { label: "공지사항", backHref: "/my" };
  }
  if (pathname === "/my/support/report") {
    return { label: "잘못된 정보 신고", backHref: "/my" };
  }
  if (pathname === "/my/support/feedback") {
    return { label: "의견 남기기", backHref: "/my" };
  }
  return { label: "고객 지원", backHref: "/my" };
}

export default function MySupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const headerConfig = getSupportHeaderConfig(pathname);

  return (
    <div className="min-h-full bg-gray-50 pointer-events-auto">
      <section className="mx-auto max-w-[430px] px-4 pb-24 pt-4">
        <header className="relative flex h-12 items-center">
          <Link
            href={headerConfig.backHref}
            aria-label="뒤로가기"
            className="z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-dg-black active:bg-dg-gray-400"
          >
            <AppIcon
              icon={appIconChevronRight}
              className="h-5 w-5 rotate-180"
            />
          </Link>
          <h1 className="pointer-events-none absolute inset-x-0 text-center text-xl font-semibold text-dg-black">
            {headerConfig.label}
          </h1>
        </header>

        <div className="pt-3">{children}</div>
      </section>
    </div>
  );
}
