// SPDX-License-Identifier: AGPL-3.0-or-later
import { BUILTIN_THEMES, CUSTOM_THEME_NAME } from "@pyxie/api-client";
import { useTheme } from "@pyxie/providers";
import { Button, Card, CardContent, Checkbox, cn, Separator } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ThemePreview from "@/components/ThemePreview.tsx";
import { useHeader } from "@/lib/header.tsx";

const tileClasses = "h-auto flex-col items-stretch gap-1.5 whitespace-normal";

export default function ThemeSettings() {
  const { t } = useTranslation("settings");
  useHeader({ title: t("theme.title"), backTo: "/settings" });
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-medium">{t("theme.title")}</p>
          <div className="grid grid-cols-2 gap-2">
            {BUILTIN_THEMES.map((option) => (
              <Button
                key={option.name}
                type="button"
                variant="ghost"
                onClick={() => setTheme(option.name)}
                className={cn(tileClasses, option.name === theme.name && "ring-2 ring-primary")}
              >
                <ThemePreview colors={option.colors} name={option.name} />
                <span className="truncate px-0.5 text-xs font-medium">{option.name}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="theme-frosted"
              checked={!!theme.frosted}
              onCheckedChange={(checked) => setTheme(theme.name, undefined, checked)}
            />
            <label htmlFor="theme-frosted" className="text-sm">
              {t("theme.frosted")}
            </label>
          </div>

          <Separator />

          <p className="text-sm font-medium">{t("theme.custom.title")}</p>
          {theme.colors ? (
            // Same grid-cols-2 sizing as the built-in tiles above, so the preview matches their
            // width exactly instead of stretching to fill the row next to the edit button.
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                aria-label={t("theme.custom.title")}
                onClick={() => setTheme(CUSTOM_THEME_NAME)}
                className={cn("h-auto rounded-md p-0", theme.name === CUSTOM_THEME_NAME && "ring-2 ring-primary")}
              >
                <ThemePreview colors={theme.colors} />
              </Button>
              <Button type="button" onClick={() => navigate("/settings/theme/create")}>
                {t("theme.custom.edit")}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => navigate("/settings/theme/create")}>
              {t("theme.custom.edit")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
