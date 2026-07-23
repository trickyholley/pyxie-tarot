import { AdminDiaryEntry } from "@pyxie/api-client";
import { Badge, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@pyxie/ui";
import { formatCardName } from "@/lib/formatCardName";

interface ViewDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  onOpenChange: (open: boolean) => void;
}

export default function ViewDiaryEntryDialog({ entry, onOpenChange }: ViewDiaryEntryDialogProps) {
  const positionLabels = new Map(entry?.positions.map((position) => [position.index, position.label]));

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
            <ul className="space-y-1">
              {entry?.cards.map((card) => (
                <li key={card.position_index} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{positionLabels.get(card.position_index)}:</span>
                  <span>{formatCardName(card.card)}</span>
                  {card.reversed && <Badge variant="outline">Reversed</Badge>}
                </li>
              ))}
            </ul>
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
