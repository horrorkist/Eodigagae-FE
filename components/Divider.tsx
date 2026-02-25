import React from "react";

export default function Divider({ className }: { className?: string }) {
  return (
    <div className={["border-b border-dg-gray-400", className].join(" ")}></div>
  );
}
