// SPDX-License-Identifier: AGPL-3.0-or-later
import { Badge, Button, Card, CardContent, CardTitle, Label, Switch, toast } from "@pyxie/ui";
import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DISCREET_ICONS, getDiscreetIcon, setDiscreetIcon } from "@/lib/discreetIcon.ts";

const tileClasses = "relative h-auto flex-col items-stretch gap-1.5 whitespace-normal";

function IconName({ name, active }: { name: string; active: boolean }) {
  if (!active) {
    return <span className="h-5 max-w-full self-center truncate px-0.5 text-xs leading-5 font-medium">{name}</span>;
  }
  return <Badge className="max-w-full min-w-0 shrink self-center truncate text-card-foreground">{name}</Badge>;
}

// Embedded as a section in AndroidSettings.tsx, not routed to directly - owns no header/page wrapper.
export default function DiscreetIconSettings() {
  const { t } = useTranslation("settings");
  const [current, setCurrent] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    getDiscreetIcon().then(setCurrent);
  }, []);

  const choose = async (id: string | null) => {
    if (switching || id === current) return;
    setSwitching(true);
    try {
      await setDiscreetIcon(id);
      setCurrent(id);
    } catch {
      toast.error(t("android.discreetIcon.error"));
    } finally {
      setSwitching(false);
    }
  };

  // Turning the switch on picks the first discreet icon; off restores the default Pyxie Tarot one.
  const toggle = (enabled: boolean) => choose(enabled ? DISCREET_ICONS[0].id : null);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col gap-3">
        <CardTitle>{t("android.discreetIcon.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("android.discreetIcon.description")}</p>
        <div className="flex items-center gap-2">
          <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Label htmlFor="discreet-icon-enabled" className="flex-1 font-normal">
            {t("android.discreetIcon.toggle")}
          </Label>
          <Switch id="discreet-icon-enabled" checked={current !== null} disabled={switching} onCheckedChange={toggle} />
        </div>
        {current !== null && (
          <div className="grid grid-cols-3 gap-2">
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
                <IconName name={t(`android.discreetIcon.icons.${option.id}`)} active={current === option.id} />
              </Button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("android.discreetIcon.note")}</p>
      </CardContent>
    </Card>
  );
}
