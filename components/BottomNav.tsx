"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faMagnifyingGlass,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Tab = {
  href: string;
  label: string;
  icon: IconDefinition;
};

const tabs: Tab[] = [
  { href: "/", label: "홈", icon: faHouse },
  { href: "/search", label: "검색", icon: faMagnifyingGlass },
  { href: "/my", label: "마이", icon: faUser },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-3 h-14">
      {tabs.map((t) => {
        const active =
          t.href === "/"
            ? pathname === "/"
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              "flex flex-col h-14 items-center justify-center gap-1",
              active ? "text-blue-500" : "text-neutral-400",
            ].join(" ")}
          >
            <FontAwesomeIcon
              icon={t.icon}
              className="w-5 h-5"
            />
            <span className={[
              "text-[10px]",
              active ? "font-semibold" : "font-medium",
            ].join(" ")}>
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
