"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaw, faBell } from "@fortawesome/free-solid-svg-icons";

export default function TopBar() {
  return (
    <div className="flex h-12 items-center justify-between px-4">
      <div className="flex items-center gap-2 text-base font-semibold">
        <FontAwesomeIcon icon={faPaw} className="w-4 h-4 text-blue-500" />
        어디가개
      </div>
      <button className="relative rounded-md p-2 text-gray-500 hover:bg-neutral-100 hover:text-gray-700 transition-colors">
        <FontAwesomeIcon icon={faBell} className="w-4.5 h-4.5" />
      </button>
    </div>
  );
}
