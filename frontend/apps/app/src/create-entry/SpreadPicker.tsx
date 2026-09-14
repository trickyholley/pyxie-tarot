// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread, spreadsAPI } from "@pyxie/api-client";
import {
  Button,
  Card,
  CardContent,
  getDisplayPositions,
  Label,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  SpreadLayoutPreview,
  SpreadViewDialog,
} from "@pyxie/ui";
import { Eye, Hand, Play, Shuffle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";
import { useAsyncData } from "@/lib/useAsyncData.ts";
import { drawCards } from "./drawCards";

export enum SelectionMode {
  Auto = "auto",
  Manual = "manual",
}

interface SpreadPickerProps {
  onDrawn: (spread: Spread, cards: EntryCard[], mode: SelectionMode) => void;
}

export default function SpreadPicker({ onDrawn }: SpreadPickerProps) {
  const { t } = useTranslation("createEntry");
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<SelectionMode>(SelectionMode.Auto);
  const [previewing, setPreviewing] = useState(false);

  const fetchSpreads = useCallback(() => spreadsAPI.listSpreads(), []);
  const { data, error } = useAsyncData(fetchSpreads, t("spreadPicker.loadError"));
  const spreads = data ?? [];
  const explicitSelection = spreads.find((spread) => spread.id === selectedId);
  const defaultSelection = spreads[0] ?? null;
  const selectedSpread = explicitSelection ?? defaultSelection;

  const spreadLabel = (spread: Spread) =>
    `${spread.name} (${t("spreadPicker.cardCount", { count: spread.num_cards })})`;

  const handleGo = () => {
    if (!selectedSpread) return;
    onDrawn(selectedSpread, mode === SelectionMode.Auto ? drawCards(selectedSpread) : [], mode);
  };

  const items = Object.fromEntries(spreads.map((spread) => [spread.id, spreadLabel(spread)]));

  const SELECTION_MODES: { key: SelectionMode; label: string; icon: typeof Shuffle }[] = [
    { key: SelectionMode.Auto, label: t("spreadPicker.cardSelectionModes.auto"), icon: Shuffle },
    { key: SelectionMode.Manual, label: t("spreadPicker.cardSelectionModes.manual"), icon: Hand },
  ];

  return (
    <Card className="mt-8 w-full max-w-md">
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Select
          items={items}
          value={selectedSpread?.id ?? null}
          onValueChange={(value) => value !== null && setSelectedId(value)}
        >
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

        <div className="flex flex-col gap-2">
          <Label>{t("spreadPicker.cardSelectionLabel")}</Label>
          <SegmentedControl
            options={SELECTION_MODES}
            value={mode}
            onChange={setMode}
            label={t("spreadPicker.cardSelectionLabel")}
            className="w-full"
          />
        </div>

        <Button type="button" disabled={!selectedSpread} onClick={handleGo}>
          <Play data-icon="inline-start" />
          {t("spreadPicker.go")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!selectedSpread}
          onClick={() => setPreviewing(true)}
        >
          <Eye data-icon="inline-start" />
          {t("spreadPicker.previewButton")}
        </Button>

        <Button
          type="button"
          variant="link"
          className="h-auto justify-center text-center whitespace-normal"
          onClick={() => navigate(AppRoute.SpreadsCreate)}
        >
          {t("spreadPicker.createSpreadLink")}
        </Button>

        {selectedSpread && (
          <>
            <Separator />
            <SpreadLayoutPreview
              positions={getDisplayPositions(selectedSpread.name, selectedSpread.positions)}
              className="max-w-37.5"
            />
          </>
        )}
      </CardContent>

      <SpreadViewDialog
        spread={previewing ? selectedSpread : null}
        onOpenChange={(open) => setPreviewing(open)}
        strings={{
          positionsLabel: t("spreadPicker.viewDialog.positionsLabel"),
          promptsLabel: t("spreadPicker.viewDialog.promptsLabel"),
          noPromptsText: t("spreadPicker.viewDialog.noPromptsText"),
          allowReversedLabel: t("spreadPicker.viewDialog.allowReversedLabel"),
        }}
      />
    </Card>
  );
}
