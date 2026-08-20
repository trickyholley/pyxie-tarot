// SPDX-License-Identifier: AGPL-3.0-or-later
import { AppIcon } from "@capawesome/capacitor-app-icon";

export interface DiscreetIconOption {
  id: string;
  label: string;
  previewSrc: string;
}

// Ids match the <activity-alias> names in android/.../AndroidManifest.xml (minus the leading dot) -
// see the comment there. Order here is the order shown in AndroidSettings.tsx's picker.
export const DISCREET_ICONS: DiscreetIconOption[] = [
  { id: "AppIconCalendar", label: "Calendar", previewSrc: "/discreet-icons/calendar.png" },
  { id: "AppIconContact", label: "Contact", previewSrc: "/discreet-icons/contact.png" },
  { id: "AppIconFocus", label: "Focus", previewSrc: "/discreet-icons/focus.png" },
  { id: "AppIconMap", label: "Map", previewSrc: "/discreet-icons/map.png" },
  { id: "AppIconHelp", label: "Help", previewSrc: "/discreet-icons/help.png" },
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
