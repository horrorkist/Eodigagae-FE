"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/icons/AppIcon";
import type { AppIconDefinition } from "@/components/icons/definitions.generated";
import {
  appIconMagnify,
  appIconMapPin,
  appIconUserCircle,
} from "@/components/icons/definitions.generated";
import { useBottomSheetStore } from "@/stores/bottomSheet";

type Tab = {
  href: string;
  label: string;
  icon: AppIconDefinition;
};

const tabs: Tab[] = [
  { href: "/", label: "홈", icon: appIconMapPin },
  { href: "/search", label: "검색", icon: appIconMagnify },
  { href: "/my", label: "마이", icon: appIconUserCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isBottomSheetOpen = useBottomSheetStore((s) => s.isOpen);

  return (
    <nav
      className={[
        "grid grid-cols-3 h-14 items-center bg-white transition-shadow duration-200",
        isBottomSheetOpen
          ? "shadow-none"
          : "shadow-[0_-6px_18px_rgba(15,23,42,0.08)]",
      ].join(" ")}
    >
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
              active ? "text-dg-green-500" : "text-dg-gray-500",
            ].join(" ")}
          >
            <AppIcon icon={t.icon} className="w-6 h-6" />
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
