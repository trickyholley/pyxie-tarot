// SPDX-License-Identifier: AGPL-3.0-or-later
import { errorMessage, userAPI } from "@pyxie/api-client";
import { useAuth, useLoading } from "@pyxie/providers";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@pyxie/ui";
import { LogOut, OctagonXIcon, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Blocks the app while the account is scheduled for deletion, until the user keeps it or logs out (issue #345). */
export default function PendingDeletionDialog() {
  const { t } = useTranslation("settings");
  const { user, logout, updateUser } = useAuth();
  const { withLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(tick);
  }, []);

  if (!user?.deletion_scheduled_for) return null;

  const keepAccount = async () => {
    try {
      updateUser(await withLoading(userAPI.cancelDeletion()));
    } catch (err) {
      setError(errorMessage(err, t("profile.pendingDeletion.error")));
    }
  };

  const hoursLeft = Math.floor((Date.parse(user.deletion_scheduled_for) - now) / HOUR_MS);

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("profile.pendingDeletion.title")}</DialogTitle>
          <DialogDescription>
            {hoursLeft >= 1
              ? t("profile.pendingDeletion.body", { count: hoursLeft })
              : t("profile.pendingDeletion.bodySoon")}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <OctagonXIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={logout}>
            <LogOut data-icon="inline-start" />
            {t("profile.pendingDeletion.logout")}
          </Button>
          <Button type="button" onClick={keepAccount}>
            <Undo2 data-icon="inline-start" />
            {t("profile.pendingDeletion.keep")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
