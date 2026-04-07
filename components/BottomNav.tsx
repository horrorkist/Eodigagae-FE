"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/icons/AppIcon";
import type { AppIconDefinition } from "@/components/icons/definitions.generated";
import {
  appIconMapPin,
  appIconPaw,
  appIconUser,
} from "@/components/icons/definitions.generated";

type Tab = {
  href: string;
  label: string;
  icon: AppIconDefinition;
};

const tabs: Tab[] = [
  { href: "/", label: "홈", icon: appIconMapPin },
  { href: "/history", label: "산책일지", icon: appIconPaw },
  { href: "/my", label: "마이페이지", icon: appIconUser },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-3 h-16 items-center bg-white">
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
              "flex flex-col h-16 items-center justify-center gap-1",
              active ? "text-dg-green-500" : "text-dg-gray-500",
            ].join(" ")}
          >
            <AppIcon
              icon={t.icon}
              className={t.label === "홈" ? "w-6 h-6" : "w-5 h-5"}
            />
            <span
              className={[
                "text-[10px]",
                active ? "font-semibold" : "font-medium",
              ].join(" ")}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
