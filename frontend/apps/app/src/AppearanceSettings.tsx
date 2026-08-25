// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  BUILTIN_THEMES,
  CUSTOM_THEME_NAME,
  DEFAULT_FONT_SCALE,
  DEFAULT_THEME,
  findBuiltinTheme,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
} from "@pyxie/api-client";
import { useTheme } from "@pyxie/providers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@pyxie/ui";
import { ALargeSmall, GlassWater, Paintbrush, Palette, Pencil, Weight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import FontPicker from "@/components/FontPicker.tsx";
import ThemePreview from "@/components/ThemePreview.tsx";
import { useHeader } from "@/lib/header.tsx";
import { PALLET_PRIDE, prideIconProps } from "@/lib/palletPride.ts";
import { AppRoute } from "@/lib/routes.ts";

const tileClasses = "relative h-auto flex-col items-stretch gap-1.5 whitespace-normal";

const FONT_SCALE_PERCENTS = Array.from({ length: (FONT_SCALE_MAX - FONT_SCALE_MIN) / 0.1 + 1 }, (_, i) =>
  Math.round((FONT_SCALE_MIN + i * 0.1) * 100),
);

function ThemeName({ name, active, pride }: { name: string; active: boolean; pride?: boolean }) {
  if (!active) {
    return <span className="h-5 max-w-full self-center truncate px-0.5 text-xs leading-5 font-medium">{name}</span>;
  }

  return (
    <Badge className={cn("max-w-full min-w-0 shrink self-center truncate text-card-foreground", pride && "text-white")}>
      {name}
    </Badge>
  );
}

export default function AppearanceSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.title"), backTo: AppRoute.Settings, icon: Paintbrush });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const fontScalePercent = Math.round((theme.font_scale ?? DEFAULT_FONT_SCALE) * 100);

  const isCustomActive = theme.name === CUSTOM_THEME_NAME;
  const isPalletPride = theme.name === PALLET_PRIDE;
  const starterColors = theme.colors ?? findBuiltinTheme(DEFAULT_THEME.name) ?? BUILTIN_THEMES[0].colors;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          <Accordion>
            <AccordionItem value="theme">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Palette className="size-4 shrink-0" aria-hidden="true" {...prideIconProps(isPalletPride)} />
                  {t("theme.list")}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_THEMES.map((option) => (
                    <Button
                      key={option.name}
                      type="button"
                      variant="ghost"
                      onClick={() => setTheme(option.name)}
                      className={tileClasses}
                    >
                      <ThemePreview colors={option.colors} name={option.name} />
                      <ThemeName
                        name={option.name}
                        active={option.name === theme.name}
                        pride={option.name === PALLET_PRIDE}
                      />
                    </Button>
                  ))}

                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={t("theme.custom.title")}
                      onClick={() => setTheme(CUSTOM_THEME_NAME, starterColors)}
                      className={cn(tileClasses, "w-full")}
                    >
                      <ThemePreview colors={starterColors} />
                      <ThemeName name={t("theme.custom.title")} active={isCustomActive} />
                    </Button>
                    {isCustomActive && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-xs"
                        aria-label={t("theme.custom.edit")}
                        onClick={() => navigate(AppRoute.AppearanceCreate)}
                        className="absolute -top-2 -right-2 size-10 rounded-full border-2 border-background"
                      >
                        <Pencil className="size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <FontPicker
              activeFont={theme.font ?? undefined}
              onSelect={(font) => setTheme(theme.name, undefined, undefined, font)}
            />
          </Accordion>

          <div className="flex items-center gap-2">
            <GlassWater
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
              {...prideIconProps(isPalletPride)}
            />
            <Label htmlFor="theme-glass" className="flex-1 font-normal">
              {t("theme.glass")}
            </Label>
            <Switch
              id="theme-glass"
              checked={!!theme.glass}
              onCheckedChange={(checked) => setTheme(theme.name, undefined, checked)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Weight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
              {...prideIconProps(isPalletPride)}
            />
            <Label htmlFor="theme-bold" className="flex-1 font-normal">
              {t("theme.bold")}
            </Label>
            <Switch
              id="theme-bold"
              checked={!!theme.bold}
              onCheckedChange={(checked) => setTheme(theme.name, undefined, undefined, undefined, checked)}
            />
          </div>

          <div className="flex items-center gap-2">
            <ALargeSmall
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
              {...prideIconProps(isPalletPride)}
            />
            <Label htmlFor="theme-font-scale" className="flex-1 font-normal">
              {t("theme.fontScale")}
            </Label>
            <Select
              items={Object.fromEntries(FONT_SCALE_PERCENTS.map((pct) => [String(pct), `${pct}%`]))}
              value={String(fontScalePercent)}
              onValueChange={(value) =>
                setTheme(theme.name, undefined, undefined, undefined, undefined, Number(value) / 100)
              }
            >
              <SelectTrigger id="theme-font-scale" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SCALE_PERCENTS.map((pct) => (
                  <SelectItem key={pct} value={String(pct)}>
                    {pct}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
