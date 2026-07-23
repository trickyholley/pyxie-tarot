import { userAPI, User } from "@pyxie/api-client";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from "@pyxie/ui";
import { Plus } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/lib/errors";

interface CreateUserDialogProps {
  onCreated: (user: User) => void;
}

const EMPTY_FORM = { username: "", email: "" };

// No password reset flow exists yet, so admin-created accounts all get the same
// password used for seeded dev users until that's built.
const SEED_PASSWORD = "pyxie-tarot";

export default function CreateUserDialog({ onCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setForm(EMPTY_FORM);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await userAPI.createUser({ ...form, password: SEED_PASSWORD });
      const created: User = await res.json();
      onCreated(created);
      handleOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus />
            Create user
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
          <DialogDescription>
            New accounts start with the "user" role — promote them below if needed. They're created with the default
            seed password ("{SEED_PASSWORD}") until a password reset flow exists.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <Label className="mb-2" htmlFor="create-username">
              Username
            </Label>
            <Input
              id="create-username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label className="mb-2" htmlFor="create-email">
              Email
            </Label>
            <Input
              id="create-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
