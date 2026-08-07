// SPDX-License-Identifier: AGPL-3.0-or-later
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@ui/lib/utils";

function Slider<Value extends number | readonly number[] = number>({
  className,
  ...props
}: SliderPrimitive.Root.Props<Value>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full items-center py-2">
        <SliderPrimitive.Track className="h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Indicator data-slot="slider-indicator" className="h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          className="block size-4 rounded-full border border-primary bg-background shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
