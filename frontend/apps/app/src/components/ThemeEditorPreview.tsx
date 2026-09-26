// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@pyxie/ui";
import { ArrowLeft, MousePointerClick } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * A live mockup of the app's chrome (header, spread-canvas patch, Card, Popover, Input,
 * Badge/accent/muted text) built from real `@pyxie/ui` pieces, not a redrawn mock - `ThemeEditor`
 * applies every edit straight to `<html>` (see its own effect), so these components' ordinary
 * Tailwind classes already read the color being edited, same as the rest of the app would. Sits
 * inside `ThemeEditor`'s "Preview" accordion, above the color rows that label each field
 * individually, so no `colors` prop or legend is needed here. The nested Popover is left
 * uncontrolled (defaults closed) rather than lifted into `useState` - collapsing the accordion
 * unmounts it, so an uncontrolled child naturally resets instead of carrying its open/closed state
 * into the next time the accordion is reopened.
 */
export default function ThemeEditorPreview() {
  const { t } = useTranslation("settings");

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-background p-3 text-foreground border">
      <div className="flex items-start gap-2">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-primary px-3 text-primary-foreground ring-1 ring-foreground/10">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t("theme.editor.preview.headerTitle")}</span>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="h-9 w-6 rounded-sm bg-spread-canvas" />
          <span className="text-[10px] text-muted-foreground">{t("theme.editor.preview.canvas")}</span>
        </div>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("theme.editor.preview.cardTitle")}</CardTitle>
          <CardDescription>{t("theme.editor.preview.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{t("theme.editor.preview.primary")}</Badge>
            <Badge variant="secondary">{t("theme.editor.preview.secondary")}</Badge>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {t("theme.editor.preview.accent")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("theme.editor.preview.mutedText")}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Input placeholder={t("theme.editor.preview.inputPlaceholder")} className="flex-1" />
        <Popover>
          <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
            <MousePointerClick data-icon="inline-start" />
            {t("theme.editor.preview.popoverTrigger")}
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>{t("theme.editor.preview.popoverTitle")}</PopoverTitle>
              <PopoverDescription>{t("theme.editor.preview.popoverDescription")}</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
