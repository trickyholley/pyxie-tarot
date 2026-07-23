import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from "@pyxie/ui";
import { CalendarIcon } from "lucide-react";

export type DateRange = { from: Date | undefined; to?: Date | undefined };

export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  placeholder?: string;
}

export default function DateRangeFilter({ value, onChange, placeholder = "Created date" }: DateRangeFilterProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-56 shrink-0 justify-start">
            <CalendarIcon />
            <span className="truncate">
              {value?.from
                ? value.to
                  ? `${value.from.toLocaleDateString()} – ${value.to.toLocaleDateString()}`
                  : value.from.toLocaleDateString()
                : placeholder}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar mode="range" selected={value} onSelect={onChange} />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(undefined)}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
