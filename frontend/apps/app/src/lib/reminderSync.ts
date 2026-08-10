// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { UserReminder } from "@pyxie/api-client";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

// Arbitrary but fixed - there's only ever one reminder, so re-scheduling always targets (and
// replaces) this same notification instead of piling up duplicates.
const REMINDER_NOTIFICATION_ID = 1;

// Schedules (or cancels) the daily reminder as a local notification - no server/push involved, so
// delivery only happens while this device has the app installed, and "timezone adaptable" falls
// out for free since `on: { hour, minute }` fires against the device's own clock.
// `notificationsEnabled` is the settings page's master switch - the reminder only actually fires
// when both it and the reminder's own `enabled` are on.
export function useReminderSync(notificationsEnabled: boolean, reminder: UserReminder | undefined) {
  const { t } = useTranslation("settings");
  const active = notificationsEnabled && !!reminder?.enabled;

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !reminder) return;

    let cancelled = false;

    (async () => {
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });
      if (!active || !reminder.time) return;

      const permission = await LocalNotifications.requestPermissions();
      if (cancelled || permission.display !== "granted") return;

      const [hour, minute] = reminder.time.split(":").map(Number);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: REMINDER_NOTIFICATION_ID,
            title: t("notifications.reminder.notification.title"),
            body: t("notifications.reminder.notification.body"),
            schedule: { on: { hour, minute }, allowWhileIdle: true },
          },
        ],
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, reminder, t]);
}
