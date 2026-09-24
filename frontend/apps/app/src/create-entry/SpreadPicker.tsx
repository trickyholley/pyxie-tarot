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

export interface PickerSelection {
  spreadId: string | null;
  mode: SelectionMode;
  canvasType: CanvasType;
}

export const DEFAULT_PICKER_SELECTION: PickerSelection = {
  spreadId: null,
  mode: SelectionMode.Auto,
  canvasType: CanvasType.Virtual,
};

interface SpreadPickerProps {
  selection: PickerSelection;
  onSelectionChange: (selection: PickerSelection) => void;
  onDrawn: (spread: Spread, cards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => void;
}

export default function SpreadPicker({ selection, onSelectionChange, onDrawn }: SpreadPickerProps) {
  const { t } = useTranslation("createEntry");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spreadId: selectedId, mode, canvasType } = selection;
  const [previewing, setPreviewing] = useState(false);
  const licenceActive = user?.licence_is_active ?? false;

  // Auto (random draw) doesn't apply to a photo canvas - force Manual the moment Photo is selected
  // so `mode` itself never drifts out of sync with what's shown.
  const handleCanvasTypeChange = (next: CanvasType) => {
    onSelectionChange({
      ...selection,
      canvasType: next,
      mode: next === CanvasType.Photo ? SelectionMode.Manual : mode,
    });
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

  const CANVAS_TYPES: { key: CanvasType; label: string; icon: typeof Image; disabled?: boolean }[] = [
    { key: CanvasType.Virtual, label: t("spreadPicker.canvasTypes.virtual"), icon: LayoutTemplate },
    {
      key: CanvasType.Photo,
      label: t("spreadPicker.canvasTypes.photo"),
      icon: Image,
      disabled: !licenceActive,
    },
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
          onValueChange={(value) => value !== null && onSelectionChange({ ...selection, spreadId: value })}
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
              className="underline underline-offset-4"
            >
              {t("spreadPicker.photoRequiresLicence")}
            </Link>
          ) : (
            canvasType === CanvasType.Photo && t("spreadPicker.photoManualNote")
          )
        }
      >
        <SegmentedControl
          options={CANVAS_TYPES}
          value={canvasType}
          onChange={handleCanvasTypeChange}
          label={canvasTypeLabel}
          className="w-full"
        />
      </SettingGroup>

      <SettingGroup label={cardSelectionLabel} blurb={t(`spreadPicker.cardSelectionBlurb.${mode}`)}>
        <SegmentedControl
          options={SELECTION_MODES}
          value={mode}
          onChange={(next) => onSelectionChange({ ...selection, mode: next })}
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
