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
import { DoorOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { linkify } from "@/marketing/PolicyBlocks.tsx";

export interface WelcomeState {
  welcome?: boolean;
}

/** Greets a brand-new account once, opened by `Login`'s signup passing `{ welcome: true }` as router state. */
export default function WelcomeModal() {
  const { t } = useTranslation("home");
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const isWelcome = !!(state as WelcomeState | null)?.welcome;
  const [open, setOpen] = useState(true); // TODO revert: isWelcome

  // Consumed on arrival, so neither a reload nor Back from a link below reopens it.
  useEffect(() => {
    if (isWelcome) navigate(pathname, { replace: true, state: null });
  }, [isWelcome, navigate, pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("welcomeModal.title")}</DialogTitle>
          <DialogDescription>{linkify(t("welcomeModal.body"), "welcome")}</DialogDescription>
          <p className="text-sm whitespace-pre-line text-muted-foreground">{t("welcomeModal.signOff")}</p>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>
            <DoorOpen data-icon="inline-start" />
            {t("welcomeModal.enter")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
