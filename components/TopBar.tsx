export default function TopBar() {
  return (
    <div className="flex h-12 items-center justify-between px-4">
      <div className="text-base font-semibold">어디가개</div>
      <button className="rounded-md px-3 py-1 text-sm hover:bg-neutral-100">
        알림
      </button>
    </div>
  );
}
