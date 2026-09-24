// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, adminAPI, errorMessage } from "@pyxie/api-client";
import { FormDialog, formatCardName, getSafeImageUrl, Input, Label, Textarea, toast, useFormValues } from "@pyxie/ui";
import { useTranslation } from "react-i18next";

interface DeckCardEditDialogProps {
  card: DeckCard | null;
  /** System-deck art is fixed (seeded), so `image_url` is shown read-only instead of an editable field. */
  isSystemDeck: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (card: DeckCard) => void;
}

export default function DeckCardEditDialog({ card, isSystemDeck, onOpenChange, onSaved }: DeckCardEditDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  const { values, setField } = useFormValues(
    card,
    (source) => ({
      uprightMeaning: source.upright_meaning,
      reversedMeaning: source.reversed_meaning,
      imageUrl: source.image_url ?? "",
    }),
    { uprightMeaning: "", reversedMeaning: "", imageUrl: "" },
  );
  const safeImageUrl = getSafeImageUrl(values.imageUrl);

  const handleSubmit = async () => {
    if (!card) return;

    try {
      const updated = await adminAPI.updateDeckCard(card.id, {
        upright_meaning: values.uprightMeaning,
        reversed_meaning: values.reversedMeaning,
        ...(isSystemDeck ? {} : { image_url: values.imageUrl.trim() || null }),
      });
      toast.success(t("cardEditDialog.savedToast"));
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, t("cardEditDialog.error")));
    }
  };

  return (
    <FormDialog
      open={card !== null}
      onOpenChange={onOpenChange}
      contentClassName="sm:max-w-lg"
      title={card && formatCardName(card.card)}
      cancelLabel={t("common:cancel")}
      submitLabel={t("common:save")}
      submittingLabel={t("common:saving")}
      onSubmit={handleSubmit}
    >
      <div>
        <Label className="mb-2" htmlFor="edit-deck-card-upright">
          {t("cardEditDialog.uprightLabel")}
        </Label>
        <Textarea
          id="edit-deck-card-upright"
          value={values.uprightMeaning}
          onChange={(e) => setField("uprightMeaning", e.target.value)}
          maxLength={1000}
        />
      </div>

      <div>
        <Label className="mb-2" htmlFor="edit-deck-card-reversed">
          {t("cardEditDialog.reversedLabel")}
        </Label>
        <Textarea
          id="edit-deck-card-reversed"
          value={values.reversedMeaning}
          onChange={(e) => setField("reversedMeaning", e.target.value)}
          maxLength={1000}
        />
      </div>

      <div>
        <Label className="mb-2">{t("cardEditDialog.artLabel")}</Label>
        {isSystemDeck ? (
          <div className="flex items-center gap-3">
            {safeImageUrl && <img src={safeImageUrl} alt="" className="h-16 w-auto shrink-0 rounded border" />}
            <p className="text-sm text-muted-foreground">{t("cardEditDialog.systemArtNote")}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Input
              id="edit-deck-card-image"
              placeholder={t("cardEditDialog.imageUrlPlaceholder")}
              value={values.imageUrl}
              onChange={(e) => setField("imageUrl", e.target.value)}
              maxLength={2000}
            />
            {safeImageUrl && <img src={safeImageUrl} alt="" className="h-16 w-auto shrink-0 rounded border" />}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
