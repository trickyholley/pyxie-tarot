// SPDX-License-Identifier: AGPL-3.0-or-later
import { DiaryEntry, EntryCard, Spread } from "@pyxie/api-client";
import { Button, Card, CardContent, cn, SegmentedControl, Separator } from "@pyxie/ui";
import { ArrowRight, Eye, Sun, Zap } from "lucide-react";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { diaryEntryPath } from "@/lib/routes.ts";
import SettingGroup from "./SettingGroup";
import SpreadPicker, { CanvasType, PickerSelection, SelectionMode } from "./SpreadPicker";

export type SpreadType = "daily" | "free";

interface TypeStepProps {
  type: SpreadType;
  onTypeChange: (type: SpreadType) => void;
  selection: PickerSelection;
  onSelectionChange: (selection: PickerSelection) => void;
  todayEntry: DiaryEntry | null;
  checkingToday: boolean;
  onContinueDraft: () => void;
  onDrawn: (spread: Spread, cards: EntryCard[], mode: SelectionMode, canvasType: CanvasType) => void;
}

// Daily/Free type picker. For Daily, shows the spread picker only once today's entry status is known
// and there's no entry yet - otherwise a Continue/View button for the existing draft/submitted entry.
export default function TypeStep({
  type,
  onTypeChange,
  selection,
  onSelectionChange,
  todayEntry,
  checkingToday,
  onContinueDraft,
  onDrawn,
}: TypeStepProps) {
  const { t } = useTranslation("createEntry");
  const navigate = useNavigate();

  const dailyDraft = type === "daily" && todayEntry !== null && !todayEntry.submitted;
  const dailySubmitted = type === "daily" && todayEntry !== null && todayEntry.submitted;
  const pending = type === "daily" && checkingToday;

  let dailyActionButton: ReactNode = null;
  if (pending) {
    dailyActionButton = (
      <Button size="lg" className="h-12 w-full px-6 text-lg" disabled aria-label={t("checkingToday")} />
    );
  } else if (dailySubmitted) {
    dailyActionButton = (
      <Button
        size="lg"
        className="h-12 w-full px-6 text-lg"
        onClick={() => todayEntry && navigate(diaryEntryPath(todayEntry.id))}
      >
        <Eye data-icon="inline-start" />
        {t("view")}
      </Button>
    );
  } else if (dailyDraft) {
    dailyActionButton = (
      <Button size="lg" className="h-12 w-full px-6 text-lg" onClick={onContinueDraft}>
        {t("continue")}
        <ArrowRight data-icon="inline-end" />
      </Button>
    );
  }

  const hasDailyAction = dailyActionButton !== null;

  const TYPES: { key: SpreadType; label: string; icon: typeof Sun }[] = [
    { key: "daily", label: t("types.daily"), icon: Sun },
    { key: "free", label: t("types.free"), icon: Zap },
  ];

  const typesLabel = t("typesLabel");

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-4">
        <SettingGroup label={typesLabel} blurb={t(`typeBlurb.${type}`)}>
          <SegmentedControl
            options={TYPES}
            value={type}
            onChange={onTypeChange}
            label={typesLabel}
            className="w-full"
          />
        </SettingGroup>

        <Separator />

        {dailyActionButton}
        {!pending && (
          // Hidden rather than unmounted so toggling Daily/Quick doesn't refetch spreads.
          <div className={cn("flex flex-col gap-4", hasDailyAction && "hidden")}>
            <SpreadPicker selection={selection} onSelectionChange={onSelectionChange} onDrawn={onDrawn} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
