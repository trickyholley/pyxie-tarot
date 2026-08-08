// SPDX-License-Identifier: AGPL-3.0-or-later
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
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type ChangelogEntry,
  CURRENT_VERSION,
  getLastSeenVersion,
  getUnseenEntries,
  markVersionSeen,
} from "@/lib/changelog.ts";

/**
 * Shows a one-time "what's new" modal the first time a returning user opens the app after an
 * update, listing patch notes since their last visit. Mounted once in `Layout`, so it only ever
 * runs its check on the initial authed page load, not on every route change.
 */
export default function WhatsNewModal() {
  const { t } = useTranslation("settings");
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = getLastSeenVersion();
    if (lastSeen === null) {
      markVersionSeen(); // first time we've tracked this browser — start from here, no backlog dump
      return;
    }
    const unseen = getUnseenEntries(lastSeen);
    if (unseen.length > 0) {
      setEntries(unseen);
      setOpen(true);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) markVersionSeen();
  };

  if (entries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("whatsNewModal.titleTemplate", { version: CURRENT_VERSION })}</DialogTitle>
          <DialogDescription>{t("whatsNewModal.description")}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.version}>
              <span className="font-medium">{entry.version}</span> — {entry.message}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose render={<Button />}>{t("whatsNewModal.gotIt")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
