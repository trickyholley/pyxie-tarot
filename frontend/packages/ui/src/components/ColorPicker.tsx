// SPDX-License-Identifier: AGPL-3.0-or-later
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/base-ui";
import { cn } from "@ui/lib/utils";
import { HexColorInput, HexColorPicker } from "react-colorful";

interface ColorPickerProps {
  id?: string;
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

/**
 * Full-spectrum hex color picker (saturation/hue square + slider, plus a typed hex field) backing
 * `<html>`'s custom theme colors - replaces the native `<input type="color">`, whose picker UI
 * varies wildly by browser/OS (some mobile browsers only offer a small preset swatch grid).
 */
export function ColorPicker({ id, value, onChange, className }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            title={value}
            className={cn(
              "flex h-9 w-14 shrink-0 items-center justify-center rounded-lg border border-input p-1",
              className,
            )}
          >
            <span className="size-full rounded-sm" style={{ backgroundColor: value }} />
          </button>
        }
      />
      <PopoverContent className="w-auto">
        <HexColorPicker color={value} onChange={onChange} />
        <HexColorInput
          color={value}
          onChange={onChange}
          prefixed
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-center text-sm uppercase outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </PopoverContent>
    </Popover>
  );
}
