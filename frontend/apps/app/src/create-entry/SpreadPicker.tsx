// SPDX-License-Identifier: AGPL-3.0-or-later
import { EntryCard, Spread, spreadsAPI } from "@pyxie/api-client";
import { useAuth } from "@pyxie/providers";
import {
  Button,
  getDisplayPositions,
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
import { Eye, Hand, Image, LayoutTemplate, Play, Shuffle } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";
import { useAsyncData } from "@/lib/useAsyncData.ts";
import { drawCards } from "./drawCards";
import SettingGroup from "./SettingGroup";

export enum SelectionMode {
  Auto = "auto",
  Manual = "manual",
}

export enum CanvasType {
  Photo = "photo",
  Virtual = "virtual",
}

interface SpreadPickerProps {
  onDrawn: (spread: Spread, cards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => void;
}

export default function SpreadPicker({ onDrawn }: SpreadPickerProps) {
  const { t } = useTranslation("createEntry");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<SelectionMode>(SelectionMode.Auto);
  const [canvasType, setCanvasType] = useState<CanvasType>(CanvasType.Virtual);
  const [previewing, setPreviewing] = useState(false);
  const licenceActive = user?.licence_is_active ?? false;

  // Auto (random draw) doesn't apply to a photo canvas - force Manual the moment Photo is selected
  // so `mode` itself never drifts out of sync with what's shown.
  const handleCanvasTypeChange = (next: CanvasType) => {
    setCanvasType(next);
    if (next === CanvasType.Photo) setMode(SelectionMode.Manual);
  };

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
    const cards = mode === SelectionMode.Auto ? drawCards(selectedSpread) : [];
    onDrawn(selectedSpread, cards, mode, canvasType);
  };

  const items = Object.fromEntries(spreads.map((spread) => [spread.id, spreadLabel(spread)]));

  const SELECTION_MODES: { key: SelectionMode; label: string; icon: typeof Shuffle; disabled?: boolean }[] = [
    {
      key: SelectionMode.Auto,
      label: t("spreadPicker.cardSelectionModes.auto"),
      icon: Shuffle,
      disabled: canvasType === CanvasType.Photo,
    },
    { key: SelectionMode.Manual, label: t("spreadPicker.cardSelectionModes.manual"), icon: Hand },
  ];

  const CANVAS_TYPES: { key: CanvasType; label: string; icon: typeof Image }[] = [
    { key: CanvasType.Virtual, label: t("spreadPicker.canvasTypes.virtual"), icon: LayoutTemplate },
    { key: CanvasType.Photo, label: t("spreadPicker.canvasTypes.photo"), icon: Image },
  ];

  const canvasTypeLabel = t("spreadPicker.canvasTypeLabel");
  const cardSelectionLabel = t("spreadPicker.cardSelectionLabel");

  return (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <SettingGroup label={t("spreadPicker.selectLabel")} blurb={selectedSpread?.description ?? undefined}>
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
      </SettingGroup>

      <SettingGroup
        label={canvasTypeLabel}
        blurb={t(`spreadPicker.canvasBlurb.${canvasType}`)}
        extra={
          !licenceActive ? (
            <Link
              to={AppRoute.Supporter}
              state={{ returnTo: AppRoute.Reading }}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              {t("spreadPicker.photoRequiresLicence")}
            </Link>
          ) : (
            canvasType === CanvasType.Photo && (
              <p className="text-xs text-muted-foreground">{t("spreadPicker.photoManualNote")}</p>
            )
          )
        }
      >
        <SegmentedControl
          options={CANVAS_TYPES}
          value={canvasType}
          onChange={handleCanvasTypeChange}
          label={canvasTypeLabel}
          disabled={!licenceActive}
          className="w-full"
        />
      </SettingGroup>

      <SettingGroup label={cardSelectionLabel} blurb={t(`spreadPicker.cardSelectionBlurb.${mode}`)}>
        <SegmentedControl
          options={SELECTION_MODES}
          value={mode}
          onChange={setMode}
          label={cardSelectionLabel}
          className="w-full"
        />
      </SettingGroup>

      <Separator />

      <Button type="button" disabled={!selectedSpread} onClick={handleGo}>
        <Play data-icon="inline-start" />
        {t("spreadPicker.go")}
      </Button>

      <Button type="button" variant="outline" size="sm" disabled={!selectedSpread} onClick={() => setPreviewing(true)}>
        <Eye data-icon="inline-start" />
        {t("spreadPicker.previewButton")}
      </Button>

      <Button
        type="button"
        variant="link"
        className="h-auto justify-center text-center whitespace-normal underline"
        onClick={() => navigate(AppRoute.SpreadsCreate, { state: { returnTo: AppRoute.Reading } })}
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
    </>
  );
}
