// SPDX-License-Identifier: AGPL-3.0-or-later
import { type ThemeColors } from "@pyxie/api-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@pyxie/ui";
import { ArrowLeft, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * A "Full preview" button that opens a modal with real `@pyxie/ui` pieces (header, spread-canvas
 * patch, Card, Popover, Input, Badge/accent/muted text) plus a collapsed legend listing every
 * `ThemeColors` field - not a redrawn mock. `ThemeEditor` applies every edit to `<html>` live (see
 * its own effect), so these components' ordinary Tailwind classes already read the color being
 * edited, same as the rest of the app would; only the legend's swatches need `colors` directly, to
 * label each one.
 */
export default function ThemeEditorPreview({ colors }: { colors: ThemeColors }) {
  const { t } = useTranslation("settings");

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="lg" className="w-full" />}>
        <Eye />
        {t("theme.editor.preview.trigger")}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>{t("theme.editor.preview.title")}</DialogTitle>
          <DialogDescription>{t("theme.editor.preview.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-0.5">
          <div className="flex flex-col gap-3 rounded-lg bg-background p-3 text-foreground">
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

          <Accordion>
            <AccordionItem value="legend">
              <AccordionTrigger>{t("theme.editor.preview.legendTrigger")}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-1.5 pl-0.5 text-xs text-muted-foreground">
                  {(Object.keys(colors) as (keyof ThemeColors)[]).map((field) => (
                    <div key={field} className="flex items-center gap-1.5">
                      <span
                        className="size-3 shrink-0 rounded-full ring-1 ring-foreground/15"
                        style={{ backgroundColor: colors[field] }}
                      />
                      <span className="truncate">{t(`theme.editor.fields.${field}`)}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}
