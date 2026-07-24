import { AdminDiaryEntry } from "@pyxie/api-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import SpreadPositionsPreview from "@/components/spread-canvas/SpreadPositionsPreview";

interface ViewDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  onOpenChange: (open: boolean) => void;
}

export default function ViewDiaryEntryDialog({ entry, onOpenChange }: ViewDiaryEntryDialogProps) {
  const cardsByIndex = new Map(entry?.cards.map((card) => [card.position_index, card]));

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {entry?.owner_username}'s entry — {entry && new Date(entry.entry_date).toLocaleDateString()}
          </DialogTitle>
          <DialogDescription>{entry?.spread_name}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          <p className="whitespace-pre-wrap">{entry?.entry_text}</p>

          <div>
            <h3 className="mb-1 font-medium">Cards</h3>
            {entry && <SpreadPositionsPreview positions={entry.positions} cardsByIndex={cardsByIndex} />}
          </div>

          <div>
            <h3 className="mb-1 font-medium">Prompts & replies</h3>
            <ul className="space-y-2">
              {entry?.prompts.map((prompt, index) => (
                <li key={index}>
                  <p className="text-muted-foreground italic">{prompt.prompt}</p>
                  <p>{prompt.reply || <span className="text-muted-foreground">No reply</span>}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
