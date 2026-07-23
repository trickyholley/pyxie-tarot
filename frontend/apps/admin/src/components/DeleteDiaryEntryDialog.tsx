import { AdminDiaryEntry } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pyxie/ui";

interface DeleteDiaryEntryDialogProps {
  entry: AdminDiaryEntry | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteDiaryEntryDialog({
  entry,
  deleting,
  onOpenChange,
  onConfirm,
}: DeleteDiaryEntryDialogProps) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete diary entry?</DialogTitle>
          <DialogDescription>
            This will permanently delete {entry?.owner_username}'s entry from{" "}
            {entry && new Date(entry.entry_date).toLocaleDateString()}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
