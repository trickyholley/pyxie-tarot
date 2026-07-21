import { Button, Input, toast } from "@pyxie/ui";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";

interface EditableCellProps {
  value: string;
  onSave: (next: string) => Promise<void>;
}

export default function EditableCell({ value, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span>{value}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  const cancel = () => setEditing(false);

  const save = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save change"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={saving}
        className="h-7 w-40"
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") cancel();
        }}
      />
      <Button variant="ghost" size="icon-xs" onClick={() => void save()} disabled={saving}>
        <Check />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={cancel} disabled={saving}>
        <X />
      </Button>
    </div>
  );
}
