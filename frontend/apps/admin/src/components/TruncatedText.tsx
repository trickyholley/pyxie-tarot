import { cn, Popover, PopoverContent, PopoverTrigger } from "@pyxie/ui";

interface TruncatedTextProps {
  value: string;
  className?: string;
}

export default function TruncatedText({ value, className }: TruncatedTextProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        nativeButton={false}
        render={<span className={cn("block truncate text-left", className)} />}
      >
        {value}
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-96 text-sm break-words whitespace-pre-wrap">{value}</PopoverContent>
    </Popover>
  );
}
