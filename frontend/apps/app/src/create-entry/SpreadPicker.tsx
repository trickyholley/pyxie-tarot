// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread, errorMessage, spreadsAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@pyxie/ui";
import { Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";
import { drawCards } from "./drawCards";

interface SpreadPickerProps {
  onDrawn: (spread: Spread, cards: EntryCard[]) => void;
}

export default function SpreadPicker({ onDrawn }: SpreadPickerProps) {
  const { t } = useTranslation("createEntry");
  const navigate = useNavigate();
  const [spreads, setSpreads] = useState<Spread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { withLoading } = useLoading();

  const spreadLabel = (spread: Spread) =>
    `${spread.name} (${t("spreadPicker.cardCount", { count: spread.num_cards })})`;

  useEffect(() => {
    withLoading(spreadsAPI.listSpreads())
      .then((result) => {
        setSpreads(result);
        setSelectedId(result[0]?.id ?? null);
      })
      .catch((err) => toast.error(errorMessage(err, t("spreadPicker.loadError"))));
  }, [withLoading, t]);

  const handleDraw = () => {
    const spread = spreads.find((s) => s.id === selectedId);
    if (!spread) return;
    onDrawn(spread, drawCards(spread));
  };

  const items = Object.fromEntries(spreads.map((spread) => [spread.id, spreadLabel(spread)]));

  return (
    <Card className="mt-8 w-full max-w-md">
      <CardContent className="flex flex-col gap-4">
        <Select items={items} value={selectedId} onValueChange={(value) => value !== null && setSelectedId(value)}>
          <SelectTrigger className="w-full">
            <SelectValue marquee placeholder={t("spreadPicker.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {spreads.map((spread) => (
              <SelectItem key={spread.id} value={spread.id} marquee>
                {spreadLabel(spread)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" disabled={!selectedId} onClick={handleDraw}>
          <Shuffle data-icon="inline-start" />
          {t("spreadPicker.draw")}
        </Button>

        <Button type="button" variant="link" size="sm" onClick={() => navigate(AppRoute.Spreads)}>
          {t("spreadPicker.createSpreadLink")}
        </Button>
      </CardContent>
    </Card>
  );
}
