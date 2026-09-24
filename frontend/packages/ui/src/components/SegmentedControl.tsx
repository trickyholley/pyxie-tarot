// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@ui/lib/utils";
import { ComponentType } from "react";

export interface SegmentedControlOption<T extends string> {
  key: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group as a whole - the options' own labels don't say what they're
   * choosing between (e.g. "Reading type" for Daily/Free). */
  label: string;
  /** Disables every option, regardless of each option's own `disabled`. */
  disabled?: boolean;
  className?: string;
}

/** A row of mutually-exclusive icon+label buttons with proper radio-group semantics, so the selected
 * option is announced rather than conveyed by background color alone - Daily/Free reading type,
 * Auto/Manual card selection, and any future two-or-more-way toggle sharing that look. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex overflow-hidden rounded-md border bg-card", className)}
    >
      {options.map(({ key, label: optionLabel, icon: Icon, disabled: optionDisabled }) => {
        const isSelected = value === key;
        const isDisabled = disabled || optionDisabled;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium",
              isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              isDisabled && (isSelected ? "cursor-not-allowed" : "cursor-not-allowed opacity-50"),
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
