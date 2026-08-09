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
import { useTheme } from "@pyxie/providers";
import { Button, Card, CardContent, Input, Label, toast } from "@pyxie/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemePreview from "@/components/ThemePreview.tsx";
import { errorMessage } from "@/lib/errors";
import { useHeader } from "@/lib/header.tsx";

const SEED_FIELDS = [
  "background",
  "foreground",
  "primary",
  "accent",
  "spreadCanvas",
] as const satisfies (keyof ThemeSeed)[];

// Editing an existing custom theme starts from its saved colors; starting fresh always starts from
// Pyxie (Default), regardless of whatever's currently active.
function startingSeedHex(theme: UserTheme): Record<(typeof SEED_FIELDS)[number], string> {
  const source: ThemeColors = theme.colors ?? findBuiltinTheme(DEFAULT_THEME.name) ?? BUILTIN_THEMES[0].colors;
  return {
    background: oklchToHex(source.background),
    foreground: oklchToHex(source.foreground),
    primary: oklchToHex(source.primary),
    accent: oklchToHex(source.accent),
    spreadCanvas: oklchToHex(source.spreadCanvas),
  };
}

export default function ThemeEditor() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.editor.title"), backTo: "/settings/appearance" });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [hex, setHex] = useState(() => startingSeedHex(theme));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const seed: ThemeSeed = {
      background: hexToOklch(hex.background),
      foreground: hexToOklch(hex.foreground),
      primary: hexToOklch(hex.primary),
      accent: hexToOklch(hex.accent),
      spreadCanvas: hexToOklch(hex.spreadCanvas),
    };
    return expandTheme(seed);
  }, [hex]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setTheme(CUSTOM_THEME_NAME, preview);
      navigate("/settings/appearance");
    } catch (err) {
      toast.error(errorMessage(err, t("theme.editor.saveError")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <ThemePreview colors={preview} />

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          {SEED_FIELDS.map((field) => (
            <div key={field} className="flex items-center justify-between gap-2">
              <Label htmlFor={`theme-color-${field}`}>{t(`theme.editor.fields.${field}`)}</Label>
              <Input
                id={`theme-color-${field}`}
                type="color"
                value={hex[field]}
                onChange={(e) => setHex((h) => ({ ...h, [field]: e.target.value }))}
                className="h-9 w-14 cursor-pointer p-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/settings/appearance")}>
          {t("theme.editor.cancel")}
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
          {t("theme.editor.apply")}
        </Button>
      </div>
    </div>
  );
}
