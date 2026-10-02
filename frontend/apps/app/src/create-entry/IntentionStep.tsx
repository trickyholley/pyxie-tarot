// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button, Card, CardContent, Label, Textarea } from "@pyxie/ui";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLogoFocus } from "@/lib/logoFocus.tsx";

interface IntentionStepProps {
  intention: string;
  onIntentionChange: (intention: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

/** TODO */
export default function IntentionStep({ intention, onIntentionChange, onContinue, onBack }: IntentionStepProps) {
  const { t } = useTranslation("createEntry");
  const { t: tc } = useTranslation("common");
  useLogoFocus(true);

  return (
    <div className="flex w-full flex-col items-center pt-36">
      <Card className="w-full animate-fade-in">
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

          <Button type="button" variant="link" onClick={onBack}>
            <ArrowLeft data-icon="inline-start" />
            {tc("back")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
