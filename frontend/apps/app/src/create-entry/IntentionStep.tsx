// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Card, CardContent, Label, Textarea } from "@pyxie/ui";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface IntentionStepProps {
  intention: string;
  onIntentionChange: (intention: string) => void;
  onContinue: () => void;
}

// Collects the user's intent for the reading
export default function IntentionStep({ intention, onIntentionChange, onContinue }: IntentionStepProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");

  return (
    <Card className="w-full animate-fade-in-quick">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="intention">{t("intentionStep.label")}</Label>
          <p className="text-sm text-muted-foreground italic">{t("intentionStep.blurb")}</p>
          <Textarea
            id="intention"
            value={intention}
            onChange={(e) => onIntentionChange(e.target.value)}
            maxLength={500}
          />
        </div>

        <Button type="button" onClick={onContinue}>
          {tc("next")}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  );
}
