// SPDX-License-Identifier: AGPL-3.0-or-later
import { type User } from "@pyxie/api-client";
import {
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
import { Eye } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ALL_CARDS } from "@/create-entry/allCards";
import { useCardArt } from "@/create-entry/useCardArt";

interface SupporterStepHeaderProps {
  user: User;
}

export default function SupporterStepHeader({ user }: SupporterStepHeaderProps) {
  const { t } = useTranslation("settings");
  const { meaningsByCard } = useCardArt();
  const [inspectOpen, setInspectOpen] = useState(false);
  const card = ALL_CARDS[user.arcana_step];
  const Icon = MAJOR_ARCANA_ICONS[user.arcana_step];
  const name = formatCardName(card);
  const meaning = meaningsByCard.get(card)?.upright_meaning;
  const stepText = t("supporter.step.number", { step: user.arcana_step, max: MAJOR_ARCANA_ICONS.length - 1 });

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
          aria-label={t("supporter.step.inspect")}
          onClick={() => setInspectOpen(true)}
        >
          <Eye />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{stepText}</p>

      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent>
          <DialogHeader className="flex flex-col items-center gap-1.5 text-center">
            <Icon className="h-16 w-16 text-primary" />
            <DialogTitle>{name}</DialogTitle>
            <DialogDescription>{stepText}</DialogDescription>
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
