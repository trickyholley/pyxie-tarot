// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  BUILTIN_THEMES,
  CUSTOM_THEME_NAME,
  DEFAULT_THEME,
  expandTheme,
  findBuiltinTheme,
  hexToOklch,
  oklchToHex,
  type ThemeColors,
  type ThemeSeed,
  type UserTheme,
} from "@pyxie/api-client";
import { applyThemeColors, resolveThemeColors, useTheme } from "@pyxie/providers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  Button,
  Card,
  CardContent,
  ColorPicker,
  Label,
  Switch,
  toast,
} from "@pyxie/ui";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemeEditorPreview from "@/components/ThemeEditorPreview.tsx";
import { errorMessage } from "@/lib/errors";
import { useHeader } from "@/lib/header.tsx";

const SEED_FIELDS = [
  "background",
  "foreground",
  "primary",
  "accent",
  "spreadCanvas",
] as const satisfies (keyof ThemeSeed)[];

// The 13 ThemeColors fields expandTheme() would otherwise derive - editable once "Advanced colors" is on.
const ADVANCED_FIELDS = [
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accentForeground",
  "border",
  "input",
  "ring",
] as const satisfies Exclude<keyof ThemeColors, (typeof SEED_FIELDS)[number]>[];

// Editing an existing custom theme starts from its saved colors; starting fresh always starts from
// Pyxie (Default), regardless of whatever's currently active.
function sourceColors(theme: UserTheme): ThemeColors {
  return theme.colors ?? findBuiltinTheme(DEFAULT_THEME.name) ?? BUILTIN_THEMES[0].colors;
}

function seedOf(source: ThemeColors): ThemeSeed {
  return {
    background: source.background,
    foreground: source.foreground,
    primary: source.primary,
    accent: source.accent,
    spreadCanvas: source.spreadCanvas,
  };
}

function startingSeedHex(source: ThemeColors): Record<(typeof SEED_FIELDS)[number], string> {
  return {
    background: oklchToHex(source.background),
    foreground: oklchToHex(source.foreground),
    primary: oklchToHex(source.primary),
    accent: oklchToHex(source.accent),
    spreadCanvas: oklchToHex(source.spreadCanvas),
  };
}

function advancedHexFrom(source: ThemeColors): Record<(typeof ADVANCED_FIELDS)[number], string> {
  return Object.fromEntries(ADVANCED_FIELDS.map((field) => [field, oklchToHex(source[field])])) as Record<
    (typeof ADVANCED_FIELDS)[number],
    string
  >;
}

function seedFromHex(hex: Record<(typeof SEED_FIELDS)[number], string>): ThemeSeed {
  return {
    background: hexToOklch(hex.background),
    foreground: hexToOklch(hex.foreground),
    primary: hexToOklch(hex.primary),
    accent: hexToOklch(hex.accent),
    spreadCanvas: hexToOklch(hex.spreadCanvas),
  };
}

function colorsFromAdvancedHex(hex: Record<(typeof ADVANCED_FIELDS)[number], string>): Partial<ThemeColors> {
  return Object.fromEntries(ADVANCED_FIELDS.map((field) => [field, hexToOklch(hex[field])]));
}

/**
 * Hex picker for the custom theme slot; converts to/from OKLCH so `expandTheme()` can derive a live
 * preview. The 5 seed swatches are always shown; "Advanced colors" reveals the other 13
 * `ThemeColors` fields that `expandTheme()` would otherwise derive, letting them be overridden
 * individually. Every edit is applied straight to `<html>` (see `applyThemeColors()`), so the whole
 * app - not just the "Full preview" modal above - reflects changes live; nothing is persisted until
 * Save.
 */
export default function ThemeEditor() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.editor.title"), backTo: "/settings/appearance" });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const source = sourceColors(theme);
  const [hex, setHex] = useState(() => startingSeedHex(source));
  const [advancedHex, setAdvancedHex] = useState(() => advancedHexFrom(source));
  // Auto-opens if the saved theme's derived fields were already customized (i.e. saved from advanced mode before).
  // Compares against source's own oklch seed strings directly - round-tripping through hex first would
  // introduce rounding noise that makes an untouched theme look customized.
  const [advanced, setAdvanced] = useState(() => {
    const derived = expandTheme(seedOf(source));
    return ADVANCED_FIELDS.some((field) => source[field] !== derived[field]);
  });
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const derived = expandTheme(seedFromHex(hex));
    return advanced ? { ...derived, ...colorsFromAdvancedHex(advancedHex) } : derived;
  }, [hex, advanced, advancedHex]);

  // Mirrors every edit onto <html> immediately, so the live header/nav/etc. preview it too - not
  // just the "Full preview" modal above. Whatever was actually active on entry (frozen once, so
  // later re-runs of ThemeProvider's own effect don't reset it) is captured for the restoring effect
  // below.
  const initialTheme = useRef(theme).current;
  const saved = useRef(false);
  useEffect(() => {
    document.documentElement.dataset.themeName = CUSTOM_THEME_NAME;
    applyThemeColors(preview);
  }, [preview]);

  // Restores whatever was actually active on the way out (Cancel, back, or any other unmount) -
  // unless a save just went through, in which case ThemeProvider's own effect has already applied
  // the newly-saved state and restoring here would stomp on it with the stale pre-edit colors.
  useEffect(() => {
    return () => {
      if (saved.current) return;
      document.documentElement.dataset.themeName = initialTheme.name;
      applyThemeColors(resolveThemeColors(initialTheme));
    };
  }, [initialTheme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setTheme(CUSTOM_THEME_NAME, preview);
      saved.current = true;
      navigate("/settings/appearance");
    } catch (err) {
      toast.error(errorMessage(err, t("theme.editor.saveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <ThemeEditorPreview colors={preview} />

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          {SEED_FIELDS.map((field) => (
            <div key={field} className="flex items-center justify-between gap-2">
              <Label htmlFor={`theme-color-${field}`}>{t(`theme.editor.fields.${field}`)}</Label>
              <ColorPicker
                id={`theme-color-${field}`}
                value={hex[field]}
                onChange={(value) => setHex((h) => ({ ...h, [field]: value }))}
              />
            </div>
          ))}

          <hr />

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="theme-advanced" className="flex-1 font-normal">
              {t("theme.editor.advanced")}
            </Label>
            <Switch
              id="theme-advanced"
              checked={advanced}
              onCheckedChange={(checked) => {
                // Re-syncs to the current derived colors each time it's switched on, rather than
                // resurrecting whatever was last typed in a prior on/off cycle this session.
                if (checked) setAdvancedHex(advancedHexFrom(expandTheme(seedFromHex(hex))));
                setAdvanced(checked);
              }}
            />
          </div>

          <Accordion value={advanced ? ["advanced-fields"] : []}>
            <AccordionItem value="advanced-fields">
              <AccordionContent className="flex flex-col gap-3">
                {ADVANCED_FIELDS.map((field) => (
                  <div key={field} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`theme-color-${field}`}>{t(`theme.editor.fields.${field}`)}</Label>
                    <ColorPicker
                      id={`theme-color-${field}`}
                      value={advancedHex[field]}
                      onChange={(value) => setAdvancedHex((h) => ({ ...h, [field]: value }))}
                    />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/settings/appearance")}>
          {t("theme.editor.cancel")}
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
          {t("theme.editor.save")}
        </Button>
      </div>
    </div>
  );
}
