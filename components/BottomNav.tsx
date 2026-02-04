"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "홈" },
  { href: "/search", label: "검색" },
  { href: "/my", label: "마이" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-3 h-14">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "flex h-14 items-center justify-center text-sm",
              active ? "font-semibold text-black" : "text-neutral-500",
            ].join(" ")}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
