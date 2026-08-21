// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import { Button } from "@pyxie/ui";
import { Download, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";
import { LOGO_FOCUS_TRANSITION_MS, useLogoFocus } from "@/lib/logoFocus.tsx";
import { downloadSpreadPdf, shareSpreadPdf, SpreadExportData, useThemeExportColors } from "@/lib/spreadExport";

interface ReadingCompleteProps {
  saveToDiary: boolean;
  exportData: SpreadExportData;
  onNewEntry: () => void;
}

/** Success screen after submit; delays route changes until the logo has flown back to its corner (see `useLogoFocus`). */
export default function ReadingComplete({ saveToDiary, exportData, onNewEntry }: ReadingCompleteProps) {
  const { t } = useTranslation("createEntry");
  const setLogoFocused = useLogoFocus(true);
  const { withLoading } = useLoading();
  const themeColors = useThemeExportColors();
  const [pending, setPending] = useState<"download" | "share" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Navigating away via the bottom nav (not just "New entry") should also give the logo
  // time to fly back to its corner before the page actually changes underneath it.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    setLogoFocused?.(false);
    const timer = setTimeout(() => blocker.proceed(), LOGO_FOCUS_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [blocker, setLogoFocused]);

  const subline = saveToDiary ? t("readingComplete.sublineSaved") : t("readingComplete.sublineFree");

  const handleNewEntry = () => {
    setLogoFocused?.(false);
    setTimeout(onNewEntry, LOGO_FOCUS_TRANSITION_MS);
  };

  const handleDownload = async () => {
    setExportError(null);
    setPending("download");
    try {
      await withLoading(downloadSpreadPdf(exportData, themeColors));
    } catch (err) {
      setExportError(errorMessage(err, t("readingComplete.downloadError")));
    } finally {
      setPending(null);
    }
  };

  const handleShare = async () => {
    setExportError(null);
    setPending("share");
    try {
      const result = await withLoading(shareSpreadPdf(exportData, themeColors));
      if (result === "downloaded") setExportError(t("readingComplete.shareFallback"));
    } catch (err) {
      // The user dismissing the OS share sheet isn't an error worth surfacing.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setExportError(errorMessage(err, t("readingComplete.shareError")));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 pt-36 text-center">
      <div className="flex flex-col gap-2">
        <p className="animate-fade-in text-2xl font-medium tracking-wide">{t("readingComplete.title")}</p>
        <p className="animate-fade-in-delay-2 text-muted-foreground italic">{subline}</p>
      </div>

      <div className="flex animate-fade-in-delay-3 flex-col items-center gap-3">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={!!pending} onClick={() => void handleDownload()}>
            <Download data-icon="inline-start" />
            {t("readingComplete.download")}
          </Button>
          <Button type="button" variant="secondary" disabled={!!pending} onClick={() => void handleShare()}>
            <Share2 data-icon="inline-start" />
            {t("readingComplete.share")}
          </Button>
        </div>
        {exportError && <p className="text-sm text-destructive">{exportError}</p>}
      </div>

      <Button type="button" className="animate-fade-in-delay-3" onClick={handleNewEntry}>
        {t("readingComplete.newEntry")}
      </Button>
    </div>
  );
}
