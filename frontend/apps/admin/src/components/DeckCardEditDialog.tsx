// SPDX-License-Identifier: AGPL-3.0-or-later
import { DeckCard, adminAPI } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatCardName,
  getSafeImageUrl,
  Input,
  Label,
  Textarea,
  toast,
} from "@pyxie/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/lib/errors";

interface DeckCardEditDialogProps {
  card: DeckCard | null;
  isSystemDeck: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (card: DeckCard) => void;
}

export default function DeckCardEditDialog({ card, isSystemDeck, onOpenChange, onSaved }: DeckCardEditDialogProps) {
  const { t } = useTranslation(["decks", "common"]);
  const [uprightMeaning, setUprightMeaning] = useState("");
  const [reversedMeaning, setReversedMeaning] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const safeImageUrl = getSafeImageUrl(imageUrl);

  useEffect(() => {
    if (card) {
      setUprightMeaning(card.upright_meaning);
      setReversedMeaning(card.reversed_meaning);
      setImageUrl(card.image_url ?? "");
    }
  }, [card]);

  const handleSubmit = async () => {
    if (!card) return;

    setSaving(true);
    try {
      const updated = await adminAPI.updateDeckCard(card.id, {
        upright_meaning: uprightMeaning,
        reversed_meaning: reversedMeaning,
        ...(isSystemDeck ? {} : { image_url: imageUrl.trim() || null }),
      });
      toast.success(t("cardEditDialog.savedToast"));
      onSaved(updated);
    } catch (err) {
      toast.error(errorMessage(err, t("cardEditDialog.error")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={card !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card && formatCardName(card.card)}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="edit-deck-card-upright">
              {t("cardEditDialog.uprightLabel")}
            </Label>
            <Textarea
              id="edit-deck-card-upright"
              value={uprightMeaning}
              onChange={(e) => setUprightMeaning(e.target.value)}
              maxLength={1000}
            />
          </div>

          <div>
            <Label className="mb-2" htmlFor="edit-deck-card-reversed">
              {t("cardEditDialog.reversedLabel")}
            </Label>
            <Textarea
              id="edit-deck-card-reversed"
              value={reversedMeaning}
              onChange={(e) => setReversedMeaning(e.target.value)}
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
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  maxLength={2000}
                />
                {safeImageUrl && <img src={safeImageUrl} alt="" className="h-16 w-auto shrink-0 rounded border" />}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? t("common:saving") : t("common:save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
