// SPDX-License-Identifier: AGPL-3.0-or-later
import { ReactNode, useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./base-ui";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
  submittingLabel: ReactNode;
  /** Runs on submit; the dialog stays in its submitting state until this settles. Handle errors inside it. */
  onSubmit: () => Promise<void>;
  /** A `DialogTrigger`, for dialogs that open themselves rather than being driven by a selected item. */
  trigger?: ReactNode;
  contentClassName?: string;
  children: ReactNode;
}

/** Shared form dialog shell: header, a `<form>` around `children`, and Cancel/submit buttons. */
export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel,
  submitLabel,
  submittingLabel,
  onSubmit,
  trigger,
  contentClassName,
  children,
}: FormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          {children}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{cancelLabel}</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
