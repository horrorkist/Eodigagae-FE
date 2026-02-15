"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import AppIcon from "@/components/icons/AppIcon";
import { useBottomSheetStore } from "@/stores/bottomSheet";

type Tab = {
  href: string;
  label: string;
  icon?: IconDefinition;
  appIconName?: "magnify" | "user-circle" | "map-pin";
};

const tabs: Tab[] = [
  { href: "/", label: "홈", appIconName: "map-pin" },
  { href: "/search", label: "검색", appIconName: "magnify" },
  { href: "/my", label: "마이", appIconName: "user-circle" },
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
              active ? "text-dg-green-500" : "text-dg-gray",
            ].join(" ")}
          >
            {/* {t.icon && <FontAwesomeIcon icon={t.icon} className="w-5 h-5" />} */}
            {t.appIconName && (
              <AppIcon name={t.appIconName} className="w-6 h-6" />
            )}
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
