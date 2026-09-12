// SPDX-License-Identifier: AGPL-3.0-or-later
import { type User } from "@pyxie/api-client";
import { Button, CardMeaningDialog, formatCardName, MAJOR_ARCANA_ICONS } from "@pyxie/ui";
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
  const { t: tc } = useTranslation("common");
  const { meaningsByCard } = useCardArt();
  const [inspectOpen, setInspectOpen] = useState(false);
  const card = ALL_CARDS[user.arcana_step];
  const Icon = MAJOR_ARCANA_ICONS[user.arcana_step];
  const name = formatCardName(card);
  const stepText = t("supporter.step.number", { step: user.arcana_step, max: MAJOR_ARCANA_ICONS.length - 1 });

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Icon className="h-32 w-32 text-primary" />
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

      <CardMeaningDialog
        open={inspectOpen}
        onOpenChange={setInspectOpen}
        card={card}
        positionLabel={stepText}
        icon={<Icon className="h-24 w-24 text-primary" />}
        deckCard={meaningsByCard.get(card)}
        strings={{ reversed: tc("reversed"), upright: tc("upright"), noMeaning: tc("noMeaning") }}
      />
    </div>
  );
}
