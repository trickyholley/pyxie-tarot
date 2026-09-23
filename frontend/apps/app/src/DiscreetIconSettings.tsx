// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@pyxie/ui";
import { Check, EyeOff, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_ICON_PREVIEW_SRC,
  DISCREET_ICONS,
  type DiscreetIconId,
  getDiscreetIcon,
  setDiscreetIcon,
  sleep,
} from "@/lib/discreetIcon.ts";

const tileClasses = "relative h-auto flex-col items-stretch gap-1.5 whitespace-normal";

// Keeps the "switching" blocker up for at least this long after choosing an icon - on some devices
// the app doesn't close until a second or two after the native call resolves (see the plugin's own
// README), so closing our dialog right on that call's resolution would leave a window where the app
// looks idle/frozen just before it vanishes.
const MIN_BLOCK_MS = 3000;

function IconName({ name, active }: { name: string; active: boolean }) {
  if (!active) {
    return <span className="h-5 max-w-full self-center truncate px-0.5 text-xs leading-5 font-medium">{name}</span>;
  }
  return <Badge className="max-w-full min-w-0 shrink self-center truncate text-card-foreground">{name}</Badge>;
}

// Embedded as a section in NativeSettings.tsx, not routed to directly - owns no header/page wrapper.
export default function DiscreetIconSettings() {
  const { t } = useTranslation("settings");
  // Picks each string's `_ios` variant where one exists - only Android can close the app or rename it.
  const context = Capacitor.getPlatform();
  const [current, setCurrent] = useState<DiscreetIconId | null>(null);
  const [switching, setSwitching] = useState(false);
  // Some Android launchers close the app the instant the icon changes (see the note below the
  // picker) - `pending` holds the choice awaiting the user's go-ahead in the confirm dialog before
  // that actually happens. `null` means no dialog is open.
  const [pending, setPending] = useState<{ id: DiscreetIconId | null } | null>(null);
  // True once the user has confirmed and the switch is underway - swaps the dialog to a
  // non-dismissible "hold on" state for MIN_BLOCK_MS so a mid-switch app close doesn't look like it
  // happened out of nowhere.
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    // Fails on a native shell installed before this feature shipped (no AppIcon plugin registered
    // yet) - leave `current` at its null default rather than an unhandled rejection.
    getDiscreetIcon()
      .then(setCurrent)
      .catch(() => {});
  }, []);

  const apply = async (id: DiscreetIconId | null) => {
    setSwitching(true);
    setBlocking(true);
    const startedAt = Date.now();
    try {
      await setDiscreetIcon(id);
      setCurrent(id);
    } catch {
      toast.error(t("native.discreetIcon.error"));
    } finally {
      const remaining = MIN_BLOCK_MS - (Date.now() - startedAt);
      if (remaining > 0) await sleep(remaining);
      setSwitching(false);
      setBlocking(false);
      setPending(null);
    }
  };

  const choose = (id: DiscreetIconId | null) => {
    if (switching || id === current) return;
    setPending({ id });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col gap-3">
        <CardTitle>{t("native.discreetIcon.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("native.discreetIcon.description", { context })}</p>
        <Accordion>
          <AccordionItem value="discreet-icon">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <EyeOff className="size-4 shrink-0" aria-hidden="true" />
                {t("native.discreetIcon.list")}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={switching}
                  onClick={() => choose(null)}
                  className={tileClasses}
                >
                  <img src={DEFAULT_ICON_PREVIEW_SRC} alt="" className="size-12 self-center rounded-2xl" />
                  <IconName name={t("native.discreetIcon.icons.default")} active={current === null} />
                </Button>
                {DISCREET_ICONS.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant="ghost"
                    disabled={switching}
                    onClick={() => choose(option.id)}
                    className={tileClasses}
                  >
                    <img src={option.previewSrc} alt="" className="size-12 self-center rounded-2xl" />
                    <IconName name={t(`native.discreetIcon.icons.${option.id}`)} active={current === option.id} />
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="text-xs text-muted-foreground">{t("native.discreetIcon.note", { context })}</p>
      </CardContent>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && !blocking && setPending(null)}>
        <DialogContent showCloseButton={!blocking}>
          {blocking ? (
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t("native.discreetIcon.applyingTitle")}
              </DialogTitle>
              <DialogDescription>{t("native.discreetIcon.applyingMessage", { context })}</DialogDescription>
            </DialogHeader>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("native.discreetIcon.confirmTitle")}</DialogTitle>
                <DialogDescription>{t("native.discreetIcon.confirmMessage", { context })}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  <X data-icon="inline-start" />
                  {t("native.discreetIcon.confirmCancel")}
                </DialogClose>
                <Button type="button" onClick={() => pending && apply(pending.id)}>
                  <Check data-icon="inline-start" />
                  {t("native.discreetIcon.confirmButton")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
