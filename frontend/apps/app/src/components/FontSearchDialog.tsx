// SPDX-License-Identifier: AGPL-3.0-or-later
import { fontsAPI, type FontSearchResult } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@pyxie/ui";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import FontRow from "@/components/FontRow.tsx";
import { useRemoteFontLoaded } from "@/lib/remoteFont.ts";
import { useDebounce } from "@/lib/useDebounce.ts";

const FONTSOURCE_URL = "https://fontsource.org";

// A result needs to load its own preview file before it can render in its own face - starts
// rendering in the system stack and swaps in once useRemoteFontLoaded resolves, same as
// FontPicker.tsx's curated rows do implicitly (their files are already loaded by the time this
// dialog is reachable).
function FontSearchRow({
  result,
  active,
  preview,
  onSelect,
}: {
  result: FontSearchResult;
  active: boolean;
  preview: string;
  onSelect: () => void;
}) {
  const loaded = useRemoteFontLoaded(result.id, result.preview_url);

  return (
    <FontRow
      label={
        active ? (
          <Badge className="text-card-foreground">{result.family}</Badge>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">{result.family}</span>
        )
      }
      fontFamily={loaded ? `"${result.id}"` : undefined}
      preview={preview}
      active={active}
      onSelect={onSelect}
    />
  );
}

const SEARCH_DEBOUNCE_MS = 300;

/** "Search fonts" trigger + dialog (issue #249) - queries GET /fonts/search (Fontsource's catalog,
 * cached server-side) rather than the five curated FONT_OPTIONS, so it's the escape hatch for anything
 * not already in that quick list. Clicking a result only stages it (Badge + marquee preview, same
 * "active" treatment FontPicker.tsx gives its own rows) - Apply is what actually calls `onSelect` with
 * its Fontsource id (the same shape FontPicker.tsx already persists for a curated pick) and closes.
 */
export default function FontSearchDialog({ onSelect }: { onSelect: (id: string) => void }) {
  const { t } = useTranslation("settings");
  const { withLoading } = useLoading();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState<FontSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const hasQuery = debouncedQuery.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedId(undefined);
      setIsSearching(false);
    }
  }, [open]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!open || !trimmed) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    withLoading(fontsAPI.searchFonts(trimmed))
      .then((matches) => {
        if (!cancelled) setResults(matches);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, withLoading]);

  const handleApply = () => {
    if (!selectedId) return;
    onSelect(selectedId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="w-full" />}>
        <Search data-icon="inline-start" />
        {t("theme.font.searchTrigger")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("theme.font.searchTitle")}</DialogTitle>
          <DialogDescription>
            <a href={FONTSOURCE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
              {t("theme.font.searchNote")}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={t("theme.font.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* Fixed (not max-) height so this doesn't resize between "typing", "searching", "no
            results", and an actual results list - the jumpiness is what issue #249 flagged. */}
        <div className="flex h-72 flex-col gap-1 overflow-y-auto">
          {isSearching ? (
            <p className="m-auto text-sm text-muted-foreground">{t("theme.font.searching")}</p>
          ) : hasQuery && results.length === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">{t("theme.font.searchEmpty")}</p>
          ) : (
            results.map((result) => (
              <FontSearchRow
                key={result.id}
                result={result}
                active={result.id === selectedId}
                preview={t("theme.font.preview")}
                onSelect={() => setSelectedId(result.id)}
              />
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" disabled={!selectedId} onClick={handleApply}>
            {t("theme.font.searchApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
