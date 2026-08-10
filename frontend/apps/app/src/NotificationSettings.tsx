// SPDX-License-Identifier: AGPL-3.0-or-later
import {Capacitor} from "@capacitor/core";
import {LocalNotifications} from "@capacitor/local-notifications";
import {updateMyNotifications, updateMyReminder} from "@pyxie/api-client/src/api/users.ts";
import {useAuth, useLoading} from "@pyxie/providers";
import {Accordion, AccordionContent, AccordionItem, Card, CardContent, Input, Label, Switch} from "@pyxie/ui";
import {Bell} from "lucide-react";
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useHeader} from "@/lib/header.tsx";

const DEFAULT_TIME = "20:00";

export default function NotificationSettings() {
    const {t} = useTranslation("settings");
    useHeader({title: t("notifications.title"), backTo: "/settings"});
    const {user, updateUser} = useAuth();
    const {withLoading} = useLoading();
    const notifications = user?.settings.notifications ?? {enabled: false};
    const reminder = user?.settings.reminder ?? {enabled: false, time: null};

    // Local echo of reminder.time so typing a new time doesn't PATCH on every keystroke - the native
    // time input fires `change` per field segment, not just on commit.
    const [time, setTime] = useState(reminder.time ?? DEFAULT_TIME);
    useEffect(() => setTime(reminder.time ?? DEFAULT_TIME), [reminder.time]);

    // The switch is our own stored preference, not the OS permission - the two can disagree (e.g. the
    // user revoked notifications for the app in device settings after turning this on). Checked (not
    // requested) on mount so opening this page surfaces that mismatch instead of leaving it silent.
    const [permissionDenied, setPermissionDenied] = useState(false);
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        LocalNotifications.checkPermissions().then((status) => setPermissionDenied(status.display === "denied"));
    }, []);

    const saveNotifications = async (enabled: boolean) => {
        const updated = await withLoading(updateMyNotifications(enabled));
        updateUser({settings: updated.settings});
    };

    const saveReminder = async (enabled: boolean, savedTime: string) => {
        const updated = await withLoading(updateMyReminder(enabled, savedTime));
        updateUser({settings: updated.settings});
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <Card className="w-full max-w-sm">
                <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
                        <Label htmlFor="notifications-enabled" className="flex-1 font-normal">
                            {t("notifications.toggle")}
                        </Label>
                        <Switch id="notifications-enabled" checked={notifications.enabled}
                                onCheckedChange={saveNotifications}/>
                    </div>
                    {notifications.enabled && permissionDenied && (
                        <p className="text-sm text-destructive">{t("notifications.permissionDenied")}</p>
                    )}
                    {/* No AccordionTrigger - the master switch above drives open state directly, there's
              nothing separate to click. Just reusing Accordion/AccordionContent for the same
              gradual expand/collapse ThemeSettings' theme list uses, instead of an instant show/hide.
              A single item holding every notification type's row, not one item per type - they all
              open/close together off the one master switch, so there's only ever one value to toggle
              in and out of `value` below. Split a type into its own AccordionItem only if it needs to
              expand/collapse on its own condition instead of riding on `notifications.enabled`. */}
                    <Accordion value={notifications.enabled ? ["notification-types"] : []}>
                        <AccordionItem value="notification-types">
                            <AccordionContent>
                                <hr className="mb-3"/>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="reminder-enabled" className="flex-1 font-normal">
                                        {t("notifications.reminder.toggle")}
                                    </Label>
                                    <Input
                                        id="reminder-time"
                                        type="time"
                                        aria-label={t("notifications.reminder.time")}
                                        className="w-auto"
                                        value={time}
                                        disabled={!reminder.enabled}
                                        onChange={(e) => setTime(e.target.value)}
                                        onBlur={() => time && time !== reminder.time && saveReminder(true, time)}
                                    />
                                    <Switch
                                        id="reminder-enabled"
                                        checked={reminder.enabled}
                                        onCheckedChange={(checked) => saveReminder(checked, time)}
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}
