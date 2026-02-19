import type { AppIconDefinition } from "@/components/icons/definitions.generated";

export type ToggleVariant = "orange" | "green" | "blue";

export type ToggleItem = {
  key: string;
  labelOn: string;
  labelOff?: string;
  emoji?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  icon: AppIconDefinition;
  variant: ToggleVariant;
  loading?: boolean;
};

