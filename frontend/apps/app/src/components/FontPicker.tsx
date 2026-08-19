// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_FONT, FONT_OPTIONS, type FontOption } from "@pyxie/api-client";
import { AccordionContent, AccordionItem, AccordionTrigger, Badge, Button, cn, useMarquee } from "@pyxie/ui";
import { Type } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT_LOADERS } from "@/lib/fonts.ts";

function marqueeStyle(isOverflowing: boolean, distance: number): CSSProperties | undefined {
  return isOverflowing ? ({ "--marquee-distance": `${distance}px` } as CSSProperties) : undefined;
}

// A row needs its own component (not inlined in FontPicker's .map()) since useMarquee is a hook.
// Single-line + marquee-on-overflow (same mechanism as the spread picker's Select, see select.tsx)
// instead of wrapping - some of these fonts (Scheherazade New especially) run tall enough that a
// second line would blow out the row height.
function FontRow({
  option,
  active,
  preview,
  onSelect,
}: {
  option: FontOption;
  active: boolean;
  preview: string;
  onSelect: () => void;
}) {
  const { containerRef, contentRef, isOverflowing, distance } = useMarquee<HTMLDivElement, HTMLSpanElement>();

  return (
    <Button type="button" variant="ghost" onClick={onSelect} className="group h-auto w-full flex-col items-start gap-1">
      {active ? (
        <Badge className="text-card-foreground">{option.name}</Badge>
      ) : (
        <span className="text-xs font-medium text-muted-foreground">{option.name}</span>
      )}
      <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
        <span
          ref={contentRef}
          style={{ fontFamily: option.stack, ...marqueeStyle(isOverflowing, distance) }}
          className={cn(
            "block text-base whitespace-nowrap",
            isOverflowing &&
              "pointer-coarse:animate-marquee pointer-fine:group-hover:animate-marquee pointer-fine:group-focus-visible:animate-marquee",
          )}
        >
          {preview}
        </span>
      </div>
    </Button>
  );
}

/**
 * Font-selection AccordionItem for ThemeSettings' Appearance page (issue #239) - a sibling item
 * inside its `<Accordion>`, not its own root, so the divider between sections matches. Bulk-loads
 * every candidate's files on mount rather than on app boot; FontLoader.tsx (app-wide) only ever
 * loads the one actually active, so opening this list is the one place all ten get fetched.
 */
export default function FontPicker({
  activeFont,
  onSelect,
}: {
  activeFont: string | undefined;
  onSelect: (name: string) => void;
}) {
  const { t } = useTranslation("settings");
  const preview = t("theme.font.preview");
  // useMarquee's ResizeObserver watches the preview span's own box, which fills its container
  // regardless of text content - it can't detect overflow that only shows up once a font finishes
  // loading after mount. document.fonts' "loadingdone" event is the browser's own authoritative
  // signal for that; bumping this on every firing and re-keying FontRow below forces a fresh mount
  // (and therefore a fresh synchronous measurement, against whatever's actually loaded by then) each
  // time - a few remounts on an out-of-the-way settings page is cheap.
  const [loadGeneration, setLoadGeneration] = useState(0);

  useEffect(() => {
    for (const load of Object.values(FONT_LOADERS)) void load();

    // jsdom (unit tests) has no CSS Font Loading API - nothing to remeasure against there anyway.
    if (!document.fonts) return;
    const onLoadingDone = () => setLoadGeneration((n) => n + 1);
    document.fonts.addEventListener("loadingdone", onLoadingDone);
    return () => document.fonts.removeEventListener("loadingdone", onLoadingDone);
  }, []);

  return (
    <AccordionItem value="font">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <Type className="size-4 shrink-0" aria-hidden="true" />
          {t("theme.font.list")}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-1.5">
          {FONT_OPTIONS.map((option) => (
            <FontRow
              key={`${option.name}-${loadGeneration}`}
              option={option}
              active={(activeFont ?? DEFAULT_FONT) === option.name}
              preview={preview}
              onSelect={() => onSelect(option.name)}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
