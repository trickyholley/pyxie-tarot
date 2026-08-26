// SPDX-License-Identifier: AGPL-3.0-or-later
import { Spread } from "@pyxie/api-client";
import { Badge } from "@ui/components/base-ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/base-ui/dialog";
import { Label } from "@ui/components/base-ui/label";
import SpreadLayoutPreview from "@ui/components/SpreadLayoutPreview";
import { displayNumber, getDisplayPositions } from "@ui/lib/spreadPositions";

export interface SpreadViewDialogStrings {
  positionsLabel: string;
  promptsLabel: string;
  noPromptsText: string;
  allowReversedLabel: string;
}

interface SpreadViewDialogProps {
  spread: Spread | null;
  onOpenChange: (open: boolean) => void;
  strings: SpreadViewDialogStrings;
}

/** Read-only twin of the spread creator/editor: same name/description/prompts/positions/layout, no inputs. */
export default function SpreadViewDialog({ spread, onOpenChange, strings }: SpreadViewDialogProps) {
  return (
    <Dialog open={spread !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl md:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{spread?.name}</DialogTitle>
          {spread?.description && <DialogDescription>{spread.description}</DialogDescription>}
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <div>
              <Label className="mb-2">{strings.positionsLabel}</Label>
              <ol className="flex flex-col gap-1">
                {spread?.positions.map((position) => (
                  <li key={position.index} className="text-muted-foreground">
                    {displayNumber(spread.positions, position)}. {position.label}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <Label className="mb-2">{strings.promptsLabel}</Label>
              {spread && spread.prompts.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {spread.prompts.map((prompt, index) => (
                    <li key={index} className="text-muted-foreground">
                      {prompt}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{strings.noPromptsText}</p>
              )}
            </div>

            {spread?.allow_reversed && <Badge variant="secondary">{strings.allowReversedLabel}</Badge>}
          </div>

          {spread && (
            <SpreadLayoutPreview
              positions={getDisplayPositions(spread.name, spread.positions)}
              className="sm:w-75 sm:shrink-0"
            />
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
