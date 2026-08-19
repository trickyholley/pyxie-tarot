import type { ReactNode } from "react";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, cn, marqueeStyle, useMarquee } from "@pyxie/ui";

/**
 * Single-line + marquee-on-overflow font preview row - shared by FontPicker.tsx's curated list and
 * FontSearchDialog.tsx's search results (issue #249). Single-line instead of wrapping since some
 * faces (Scheherazade New especially, or a long searched family name) run tall enough that a second
 * line would blow out the row height. `label` is caller-composed (a plain name, an active Badge, a
 * dyslexia-friendly tag, ...) since curated and searched rows show different things there;
 * `fontFamily` undefined renders `preview` in the inherited font, e.g. while a search result's file
 * is still loading. Marquee only ever runs for the `active` (selected) row - with every row capable
 * of animating at once, a touch device (no hover to gate it) turned the whole list into constant
 * motion, so only the row that matters right now moves.
 */
export default function FontRow({
  label,
  fontFamily,
  preview,
  active,
  onSelect,
}: {
  label: ReactNode;
  fontFamily: string | undefined;
  preview: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { containerRef, contentRef, isOverflowing, distance } = useMarquee<HTMLDivElement, HTMLSpanElement>();

  return (
    <Button type="button" variant="ghost" onClick={onSelect} className="group h-auto w-full flex-col items-start gap-1">
      {label}
      <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
        <span
          ref={contentRef}
          style={{ fontFamily, ...(active ? marqueeStyle(isOverflowing, distance) : undefined) }}
          className={cn(
            "block text-base whitespace-nowrap",
            active &&
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
