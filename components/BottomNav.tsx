"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import AppIcon from "@/components/icons/AppIcon";

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

  return (
    <nav className="grid grid-cols-3 h-14 items-center">
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
