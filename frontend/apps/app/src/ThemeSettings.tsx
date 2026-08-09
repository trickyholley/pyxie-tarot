// SPDX-License-Identifier: AGPL-3.0-or-later
import { BUILTIN_THEMES, CUSTOM_THEME_NAME } from "@pyxie/api-client";
import { useTheme } from "@pyxie/providers";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  cn,
  Label,
  Switch,
} from "@pyxie/ui";
import { GlassWater, Palette, Pencil, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemePreview from "@/components/ThemePreview.tsx";
import { useHeader } from "@/lib/header.tsx";

const tileClasses = "relative h-auto flex-col items-stretch gap-1.5 whitespace-normal";

// Badges the active tile, inset within its own box rather than protruding past the edge - a ring/
// border flush against the tile's edge gets clipped by the accordion panel's overflow-hidden. White
// fill keeps the star legible against tile previews of any color; sized up (rather than glowing) to
// read as "active" at a glance.
function ActiveStar() {
  return (
    <Star aria-hidden="true" strokeWidth={2.5} className="absolute top-1 left-1 z-10 size-5 fill-white text-primary" />
  );
}

export default function ThemeSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.title"), backTo: "/settings" });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isCustomActive = theme.name === CUSTOM_THEME_NAME;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          <Accordion>
            <AccordionItem value="theme">
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <Palette className="size-4 shrink-0" aria-hidden="true" />
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
                      {option.name === theme.name && <ActiveStar />}
                      <ThemePreview colors={option.colors} name={option.name} />
                      <span className="truncate px-0.5 text-xs font-medium">{option.name}</span>
                    </Button>
                  ))}

                  {theme.colors ? (
                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={t("theme.custom.title")}
                        onClick={() => setTheme(CUSTOM_THEME_NAME)}
                        className={cn(tileClasses, "w-full")}
                      >
                        {isCustomActive && <ActiveStar />}
                        <ThemePreview colors={theme.colors} />
                        <span className="truncate px-0.5 text-xs font-medium">{t("theme.custom.title")}</span>
                      </Button>
                      {isCustomActive && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-xs"
                          aria-label={t("theme.custom.edit")}
                          onClick={() => navigate("/settings/appearance/create")}
                          className="absolute top-1 right-1"
                        >
                          <Pencil />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={t("theme.custom.title")}
                      onClick={() => navigate("/settings/appearance/create")}
                      className={tileClasses}
                    >
                      <div className="flex h-14 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground">
                        <Pencil className="size-4" />
                      </div>
                      <span className="truncate px-0.5 text-xs font-medium">{t("theme.custom.title")}</span>
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center gap-2">
            <GlassWater className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Label htmlFor="theme-glass" className="flex-1 font-normal">
              {t("theme.glass")}
            </Label>
            <Switch
              id="theme-glass"
              checked={!!theme.glass}
              onCheckedChange={(checked) => setTheme(theme.name, undefined, checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
