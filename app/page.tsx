import Link from "next/link";

export default function HomePage() {
  const menus = [
    {
      href: "/map",
      label: "지도",
    },
    {
      href: "/geo",
      label: "위치",
    },
    {
      href: "/input",
      label: "인풋",
    },
    {
      href: "/bottomSheet",
      label: "바텀시트",
    },
  ];
  return (
    <div className="space-y-3">
      <div className="p-10 grid grid-cols-2 gap-10">
        {menus.map((m) => {
          return (
            <Link
              key={m.label}
              href={m.href}
              className="border rounded-md aspect-square flex justify-center items-center"
            >
              <p>{m.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
