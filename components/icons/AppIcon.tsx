import type { SVGProps } from "react";
import type { AppIconDefinition } from "./definitions.generated";

type AppIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  icon: AppIconDefinition;
  title?: string;
};

export default function AppIcon({
  icon,
  title,
  className,
  ...props
}: AppIconProps) {
  const withLabel = typeof title === "string" && title.length > 0;

  return (
    <svg
      viewBox={icon.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={withLabel ? "img" : undefined}
      aria-label={withLabel ? title : undefined}
      aria-hidden={withLabel ? undefined : true}
      {...props}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}
