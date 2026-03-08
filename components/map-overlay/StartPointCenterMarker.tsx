import AppIcon from "@/components/icons/AppIcon";
import {
  appIconMarker,
  appIconPaw,
} from "@/components/icons/definitions.generated";

export default function StartPointCenterMarker() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
      <div className="relative h-16 w-16">
        <AppIcon icon={appIconMarker} className="h-16 w-16 text-dg-green-500" />
        <AppIcon
          icon={appIconPaw}
          className="absolute left-1/2 top-[41%] h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 text-white"
        />
      </div>
    </div>
  );
}
