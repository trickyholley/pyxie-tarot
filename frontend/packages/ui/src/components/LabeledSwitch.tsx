// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType } from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@ui/lib/utils";

export interface LabeledSwitchOption {
  label: string;
  icon?: ComponentType<{ className?: string }>;
}

interface LabeledSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  offOption: LabeledSwitchOption;
  onOption: LabeledSwitchOption;
  className?: string;
}

/** A two-option Switch - extends the base `Switch` (`base-ui/switch.tsx`) with a label (and optional
 * icon) on each side instead of a bare on/off circle, same track and sliding-pill mechanics underneath.
 * It's still a single `SwitchPrimitive.Root`, not two separate buttons, so clicking anywhere on it
 * (either label included) toggles it exactly like a plain Switch does - no dead zone on the active side.
 * `grid-cols-2` sizes both sides equally to whichever label is widest, rather than a fixed width that
 * would clip a long one. The pill's position is driven directly off the `checked` prop via inline style,
 * rather than the base Switch's own `data-checked:translate-x-*` classes - Tailwind v4's `translate-x-*`
 * utilities set the standalone `translate` CSS property (not `transform`), and something in this
 * project's build was letting the unconditional `data-unchecked:translate-x-0` win the cascade over the
 * conditional `data-checked:translate-x-full` regardless of which one actually matched the element. */
export default function LabeledSwitch({
  checked,
  onCheckedChange,
  offOption,
  onOption,
  className,
}: LabeledSwitchProps) {
  const OffIcon = offOption.icon;
  const OnIcon = onOption.icon;

  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "group relative grid grid-cols-2 rounded-full border border-transparent bg-input p-1 shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary shadow-xs transition-transform"
        style={{ transform: checked ? "translateX(100%)" : "translateX(0)" }}
      />
      <span className="relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors group-data-unchecked:text-primary-foreground">
        {OffIcon && <OffIcon className="size-3.5" />}
        {offOption.label}
      </span>
      <span className="relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors group-data-checked:text-primary-foreground">
        {OnIcon && <OnIcon className="size-3.5" />}
        {onOption.label}
      </span>
    </SwitchPrimitive.Root>
  );
}
