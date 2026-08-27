// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SpreadCanvas,
  SpreadPromptsEditor,
  toast,
  useSpreaditorForm,
  type SpreadEditorValidationError,
  type SpreadEditorValues,
} from "@pyxie/ui";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type SpreadFormValues = SpreadEditorValues;

interface SpreadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Form fields re-initialize from this value whenever its identity changes - caller must memoize it. */
  initialValues: SpreadFormValues;
  trigger?: ReactNode;
  /** Prefixes this dialog's field `id`s, so create/edit's two instances don't collide in one DOM. */
  idPrefix: string;
  title: string;
  description: ReactNode;
  submitLabel: string;
  submittingLabel: string;
  submitErrorMessage: string;
  onSubmit: (values: SpreadFormValues) => Promise<void>;
}

/** Shared name/description/positions/prompts form behind both create- and edit-spread dialogs. */
export default function SpreadFormDialog({
  open,
  onOpenChange,
  initialValues,
  trigger,
  idPrefix,
  title,
  description,
  submitLabel,
  submittingLabel,
  submitErrorMessage,
  onSubmit,
}: SpreadFormDialogProps) {
  const { t } = useTranslation(["spreads", "common"]);

  const handleValidationError = (error: SpreadEditorValidationError) =>
    toast.error(error === "label" ? t("form.labelRequiredError") : t("form.emptyPromptsError"));

  const handleFormSubmit = async (values: SpreadFormValues) => {
    try {
      await onSubmit(values);
    } catch (err) {
      toast.error(errorMessage(err, submitErrorMessage));
    }
  };

  const form = useSpreaditorForm({
    initialValues,
    onValidationError: handleValidationError,
    onSubmit: handleFormSubmit,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="flex max-h-[90vh] min-w-4xl max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-4">
              <div>
                <Label className="mb-2" htmlFor={`${idPrefix}-name`}>
                  {t("form.nameLabel")}
                </Label>
                <Input
                  id={`${idPrefix}-name`}
                  value={form.name}
                  onChange={(e) => form.setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label className="mb-2" htmlFor={`${idPrefix}-description`}>
                  {t("form.descriptionLabel")}
                </Label>
                <Input
                  id={`${idPrefix}-description`}
                  value={form.description}
                  onChange={(e) => form.setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <SpreadPromptsEditor
                prompts={form.prompts}
                onUpdatePrompt={form.updatePrompt}
                onRemovePrompt={form.removePrompt}
                onAddPrompt={form.addPrompt}
                strings={{ label: t("promptsEditor.label"), addPromptAria: t("promptsEditor.addPromptAria") }}
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
                positionsLabel: t("canvas.positionsLabel"),
                allowReversedLabel: t("canvas.allowReversedLabel"),
                uniformCardSizeLabel: t("canvas.uniformCardSizeLabel"),
                countTemplate: (count, max) => t("canvas.countTemplate", { count, max }),
                addPositionAria: t("canvas.addPositionAria"),
                positionLabelList: {
                  labelPlaceholder: t("canvas.labelPlaceholder"),
                  removeAria: (number) => t("canvas.removeAria", { number }),
                  detailsAria: (number) => t("canvas.detailsAria", { number }),
                  scale: { scaleLabel: t("canvas.scaleLabel") },
                  rotation: { rotationLabel: t("canvas.rotationLabel") },
                },
              }}
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t("common:cancel")}</DialogClose>
            <Button type="submit" disabled={form.submitting}>
              {form.submitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
