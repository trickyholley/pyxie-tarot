// SPDX-License-Identifier: AGPL-3.0-or-later
import { type User } from "@pyxie/api-client";
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatCardName,
  MAJOR_ARCANA_ICONS,
} from "@pyxie/ui";
import { Eye, Gem } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ALL_CARDS } from "@/create-entry/allCards";
import { useCardArt } from "@/create-entry/useCardArt";

interface SupporterLevelHeaderProps {
  user: User;
}

export default function SupporterLevelHeader({ user }: SupporterLevelHeaderProps) {
  const { t } = useTranslation("settings");
  const { meaningsByCard } = useCardArt();
  const [inspectOpen, setInspectOpen] = useState(false);
  const card = ALL_CARDS[user.arcana_level];
  const Icon = MAJOR_ARCANA_ICONS[user.arcana_level];
  const name = formatCardName(card);
  const meaning = meaningsByCard.get(card)?.upright_meaning;
  const levelText = t("supporter.level.number", { level: user.arcana_level, max: MAJOR_ARCANA_ICONS.length - 1 });

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Icon className="h-16 w-16 text-primary" />
      <div className="flex items-center gap-1.5">
        <p className="text-xl font-semibold">{name}</p>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label={t("supporter.level.inspect")}
          onClick={() => setInspectOpen(true)}
        >
          <Eye />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{levelText}</p>
      <Badge variant={user.licence_is_active ? "default" : "outline"}>
        <Gem data-icon="inline-start" />
        {user.licence_is_active ? t("supporter.level.active") : t("supporter.level.inactive")}
      </Badge>

      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-16 w-16 text-primary" />
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>{levelText}</DialogDescription>
          </DialogHeader>
          {meaning && <p className="text-sm text-muted-foreground">{meaning}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" />}>{t("supporter.outcome.dismiss")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
