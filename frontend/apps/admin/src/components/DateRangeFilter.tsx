// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from "@pyxie/ui";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export type DateRange = { from: Date | undefined; to?: Date | undefined };

export function formatDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  placeholder?: string;
}

export default function DateRangeFilter({ value, onChange, placeholder }: DateRangeFilterProps) {
  const { t } = useTranslation("common");
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
                : (placeholder ?? t("createdDate"))}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar mode="range" selected={value} onSelect={onChange} />
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(undefined)}>
              {t("clear")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
