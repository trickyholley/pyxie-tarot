// SPDX-License-Identifier: AGPL-3.0-or-later
import { AppIcon } from "@capawesome/capacitor-app-icon";

// Also the settings.json android.discreetIcon.icons keys, so DiscreetIconSettings.tsx's `t()` call
// type-checks against them.
export type DiscreetIconId = "AppIconCalendar" | "AppIconContact" | "AppIconFocus" | "AppIconMap" | "AppIconHelp";

export interface DiscreetIconOption {
  id: DiscreetIconId;
  previewSrc: string;
}

// Ids match the <activity-alias> names in android/.../AndroidManifest.xml (minus the leading dot) -
// see the comment there. Order here is the order shown in AndroidSettings.tsx's picker.
export const DISCREET_ICONS: DiscreetIconOption[] = [
  { id: "AppIconCalendar", previewSrc: "/discreet-icons/calendar.png" },
  { id: "AppIconContact", previewSrc: "/discreet-icons/contact.png" },
  { id: "AppIconFocus", previewSrc: "/discreet-icons/focus.png" },
  { id: "AppIconMap", previewSrc: "/discreet-icons/map.png" },
  { id: "AppIconHelp", previewSrc: "/discreet-icons/help.png" },
];

/** Currently active icon's id, or null if the default Pyxie Tarot icon is active. */
export const getDiscreetIcon = async (): Promise<string | null> => {
  const { icon } = await AppIcon.getCurrentIcon();
  return icon;
};

/** Switches the launcher icon/label. Pass null to restore the default Pyxie Tarot one. */
export const setDiscreetIcon = async (id: string | null): Promise<void> => {
  if (id === null) {
    await AppIcon.resetIcon();
  } else {
    await AppIcon.setIcon({ icon: id });
  }
};
