// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage, spreadsAPI } from "@pyxie/api-client";
import { useLoading } from "@pyxie/providers";
import {
  Button,
  Card,
  CardContent,
  createDefaultPositions,
  Input,
  Label,
  normalizePositions,
  SpreadCanvas,
  SpreadEditorValidationError,
  SpreadEditorValues,
  SpreadPromptsEditor,
  toast,
  toSpreadPayload,
  useSpreaditorForm,
} from "@pyxie/ui";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useHeader } from "@/lib/header.tsx";
import { AppRoute } from "@/lib/routes.ts";
import { useAsyncData } from "@/lib/useAsyncData.ts";

/** Full-page create/edit form for a user's own custom spread - stacked single-column, unlike admin's
 * two-column dialog, to fit a phone-width screen. Shares its state/validation/canvas with admin via
 * `useSpreaditorForm`/`SpreadCanvas` (`@pyxie/ui`). */
export default function Spreaditor() {
  const { spreadId } = useParams<{ spreadId: string }>();
  const isEdit = spreadId !== undefined;
  const { t } = useTranslation("settings");
  useHeader({
    title: t("spreads.editor.title"),
    backTo: AppRoute.Spreads,
  });
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  const fetchSpread = useCallback(() => (spreadId ? spreadsAPI.getSpread(spreadId) : undefined), [spreadId]);
  const { data: spread, error: loadError } = useAsyncData(fetchSpread, t("spreads.editor.loadError"));

  const initialValues = useMemo<SpreadEditorValues>(
    () =>
      spread
        ? {
            name: spread.name,
            description: spread.description ?? "",
            positions: normalizePositions(spread.positions),
            prompts: spread.prompts,
            allowReversed: spread.allow_reversed,
          }
        : { name: "", description: "", positions: createDefaultPositions(), prompts: [], allowReversed: true },
    [spread],
  );

  const handleValidationError = (error: SpreadEditorValidationError) =>
    toast.error(error === "label" ? t("spreads.editor.labelRequiredError") : t("spreads.editor.emptyPromptsError"));

  const handleSpreadSubmit = async (values: SpreadEditorValues) => {
    const payload = toSpreadPayload(values);
    try {
      if (isEdit && spreadId) {
        await withLoading(spreadsAPI.updateSpread(spreadId, payload));
      } else {
        await withLoading(spreadsAPI.createSpread(payload));
      }
      navigate(AppRoute.Spreads);
    } catch (err) {
      toast.error(errorMessage(err, t(isEdit ? "spreads.editor.saveError" : "spreads.editor.createError")));
    }
  };

  const form = useSpreaditorForm({
    initialValues,
    onValidationError: handleValidationError,
    onSubmit: handleSpreadSubmit,
  });

  const ready = !isEdit || spread !== null;
  const submittingLabelKey = isEdit ? "spreads.editor.saving" : "spreads.editor.creating";
  const idleLabelKey = isEdit ? "spreads.editor.save" : "spreads.editor.create";
  const submitLabel = t(form.submitting ? submittingLabelKey : idleLabelKey);

  return (
    <div className="flex flex-col gap-4 p-4">
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {ready && (
        <Card className="w-full max-w-2xl">
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }}
            >
              <div>
                <Label className="mb-2" htmlFor="spread-name">
                  {t("spreads.editor.nameLabel")}
                </Label>
                <Input
                  id="spread-name"
                  value={form.name}
                  onChange={(e) => form.setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label className="mb-2" htmlFor="spread-description">
                  {t("spreads.editor.descriptionLabel")}
                </Label>
                <Input
                  id="spread-description"
                  value={form.description}
                  onChange={(e) => form.setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <SpreadCanvas
                positions={form.positions}
                onChange={form.setPositions}
                showInvalidLabels={form.attemptedSubmit}
                allowReversed={form.allowReversed}
                onAllowReversedChange={form.setAllowReversed}
                uniformScale={form.uniformScale}
                onUniformScaleChange={form.setUniformScale}
                strings={{
                  positionsLabel: t("spreads.editor.canvas.positionsLabel"),
                  allowReversedLabel: t("spreads.editor.canvas.allowReversedLabel"),
                  uniformCardSizeLabel: t("spreads.editor.canvas.uniformCardSizeLabel"),
                  countTemplate: (count, max) => t("spreads.editor.canvas.countTemplate", { count, max }),
                  addPositionAria: t("spreads.editor.canvas.addPositionAria"),
                  positionLabelList: {
                    labelPlaceholder: t("spreads.editor.canvas.labelPlaceholder"),
                    removeAria: (number) => t("spreads.editor.canvas.removeAria", { number }),
                    detailsAria: (number) => t("spreads.editor.canvas.detailsAria", { number }),
                    scale: { scaleLabel: t("spreads.editor.canvas.scaleLabel") },
                    rotation: { rotationLabel: t("spreads.editor.canvas.rotationLabel") },
                  },
                }}
              />

              <SpreadPromptsEditor
                prompts={form.prompts}
                onUpdatePrompt={form.updatePrompt}
                onRemovePrompt={form.removePrompt}
                onAddPrompt={form.addPrompt}
                strings={{
                  label: t("spreads.editor.promptsEditor.label"),
                  addPromptAria: t("spreads.editor.promptsEditor.addPromptAria"),
                }}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(AppRoute.Spreads)}>
                  {t("spreads.editor.cancel")}
                </Button>
                <Button type="submit" className="flex-1" disabled={form.submitting}>
                  {submitLabel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
