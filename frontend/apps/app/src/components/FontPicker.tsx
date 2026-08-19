// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_FONT, FONT_OPTIONS, SYSTEM_FONT_NAME } from "@pyxie/api-client";
import { AccordionContent, AccordionItem, AccordionTrigger, Badge, Separator } from "@pyxie/ui";
import { Type } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FontRow from "@/components/FontRow.tsx";
import FontSearchDialog from "@/components/FontSearchDialog.tsx";
import { FONT_LOADERS } from "@/lib/fonts.ts";
import { fontsourceFileUrl, humanizeFontId, useRemoteFontLoaded } from "@/lib/remoteFont.ts";

// Coalesces a burst of "loadingdone" events (all ten candidates settling close together) into one
// remeasure instead of one FontRow remount per event.
const LOADINGDONE_DEBOUNCE_MS = 150;

// Shows whatever non-curated font is currently active (issue #249) - the only place in the picker a
// search pick is otherwise visible again, since none of FONT_OPTIONS' rows would ever show as active
// for it. Sits below the curated list/Search fonts button rather than replacing anything there.
function ActiveCustomFontRow({ font, preview, onSelect }: { font: string; preview: string; onSelect: () => void }) {
  const loaded = useRemoteFontLoaded(font, fontsourceFileUrl(font));

  return (
    <FontRow
      label={<Badge className="text-card-foreground">{humanizeFontId(font)}</Badge>}
      fontFamily={loaded ? `"${font}"` : undefined}
      preview={preview}
      active
      onSelect={onSelect}
    />
  );
}

// Reserves ActiveCustomFontRow's spot even with no search pick active, so the list doesn't
// grow/shrink a row depending on whether one is.
function EmptyCustomFontRow({ label }: { label: string }) {
  return <p className="px-2.5 py-1.5 text-xs text-muted-foreground italic">{label}</p>;
}

/**
 * Font-selection AccordionItem for ThemeSettings' Appearance page (issue #239) - a sibling item
 * inside its `<Accordion>`, not its own root, so the divider between sections matches. Bulk-loads
 * every curated candidate's files once this item is expanded; FontLoader.tsx (app-wide) only ever
 * loads the one actually active, so opening this list is the one place all five get fetched.
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
  const dyslexiaFriendlyLabel = t("theme.font.dyslexiaFriendly");
  // A search pick's id never matches a FONT_OPTIONS name, so its presence here is what distinguishes
  // it from a curated (or unset) activeFont.
  const customFont = activeFont && !FONT_OPTIONS.some((option) => option.name === activeFont) ? activeFont : undefined;
  const [isOpen, setIsOpen] = useState(false);
  // useMarquee's ResizeObserver watches the preview span's own box, which fills its container
  // regardless of text content - it can't detect overflow that only shows up once a font finishes
  // loading after mount. document.fonts' "loadingdone" event is the browser's own authoritative
  // signal for that; bumping this (debounced) and re-keying FontRow below forces a fresh mount (and
  // therefore a fresh synchronous measurement, against whatever's actually loaded by then).
  const [loadGeneration, setLoadGeneration] = useState(0);

  useEffect(() => {
    // Re-invoking an already-resolved import() just replays the module cache, so reopening the item
    // costs nothing extra.
    if (isOpen) for (const load of Object.values(FONT_LOADERS)) load().catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    // jsdom (unit tests) has no CSS Font Loading API - nothing to remeasure against there anyway.
    if (!document.fonts) return;
    let timer: ReturnType<typeof setTimeout>;
    const onLoadingDone = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLoadGeneration((n) => n + 1), LOADINGDONE_DEBOUNCE_MS);
    };
    document.fonts.addEventListener("loadingdone", onLoadingDone);
    return () => {
      clearTimeout(timer);
      document.fonts.removeEventListener("loadingdone", onLoadingDone);
    };
  }, []);

  return (
    <AccordionItem value="font" onOpenChange={setIsOpen}>
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <Type className="size-4 shrink-0" aria-hidden="true" />
          {t("theme.font.list")}
        </span>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-1.5">
        {FONT_OPTIONS.map((option) => {
          const isActive = (activeFont ?? DEFAULT_FONT) === option.name;
          const displayName = option.name === SYSTEM_FONT_NAME ? t("theme.font.system") : option.name;

          return (
            <Fragment key={`${option.name}-${loadGeneration}`}>
              {/* System Default sits behind its own divider (issue #249) - it's the "reset to
                  native" choice rather than one more face in the alphabetical run above it. */}
              {option.name === SYSTEM_FONT_NAME && <Separator className="my-0.5" />}
              <FontRow
                label={
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isActive ? (
                      <Badge className="text-card-foreground">{displayName}</Badge>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{displayName}</span>
                    )}
                    {option.dyslexiaFriendly && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {dyslexiaFriendlyLabel}
                      </Badge>
                    )}
                  </div>
                }
                fontFamily={option.stack}
                preview={preview}
                active={isActive}
                onSelect={() => onSelect(option.name)}
              />
            </Fragment>
          );
        })}
        <Separator className="my-0.5" />
        <FontSearchDialog onSelect={onSelect} />
        {customFont ? (
          <ActiveCustomFontRow font={customFont} preview={preview} onSelect={() => onSelect(customFont)} />
        ) : (
          <EmptyCustomFontRow label={t("theme.font.noCustomFont")} />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
