// SPDX-License-Identifier: AGPL-3.0-or-later
import { BUILTIN_THEMES, CUSTOM_THEME_NAME } from "@pyxie/api-client";
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
  Switch,
} from "@pyxie/ui";
import { GlassWater, Palette, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemePreview from "@/components/ThemePreview.tsx";
import { useHeader } from "@/lib/header.tsx";
import { PALLET_PRIDE, prideIconProps } from "@/lib/palletPride.ts";

const tileClasses = "relative h-auto flex-col items-stretch gap-1.5 whitespace-normal";

// Active tile shows a filled Badge pill instead of a plain caption; `self-center` + fixed height on
// both branches keeps the row's size unchanged either way. Overrides Badge's default
// `text-primary-foreground` - several derived primary-foregrounds read poorly at this text size, so
// this keeps the plain caption's original `text-card-foreground` instead. Pallet (Pride) still
// forces white (matches Header.tsx), since its pill background is the busy rainbow gradient.
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

export default function ThemeSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.title"), backTo: "/settings" });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isCustomActive = theme.name === CUSTOM_THEME_NAME;
  const isPalletPride = theme.name === PALLET_PRIDE;

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

                  {theme.colors ? (
                    <div className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={t("theme.custom.title")}
                        onClick={() => setTheme(CUSTOM_THEME_NAME)}
                        className={cn(tileClasses, "w-full")}
                      >
                        <ThemePreview colors={theme.colors} />
                        <ThemeName name={t("theme.custom.title")} active={isCustomActive} />
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
                      <ThemeName name={t("theme.custom.title")} active={false} />
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
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
        </CardContent>
      </Card>
    </div>
  );
}
