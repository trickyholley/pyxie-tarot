import { Capacitor } from "@capacitor/core";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { AppIcon } from "@capawesome/capacitor-app-icon";

// Also the settings.json native.discreetIcon.icons keys, so DiscreetIconSettings.tsx's `t()` call
// type-checks against them.
export type DiscreetIconId = "AppIconCalendar" | "AppIconContact" | "AppIconFocus" | "AppIconMap" | "AppIconHelp";

// iOS alternate-icon asset-catalog set names (Assets.xcassets/Discreet*.appiconset). These can't
// reuse the ids above directly - the plugin's README documents that an alternate icon set whose name
// starts with "AppIcon" renders as a blank placeholder on real iOS devices, a bug that doesn't
// reproduce in the Simulator. `setDiscreetIcon`/`getDiscreetIcon` translate through this map so the
// rest of the app only ever deals in `DiscreetIconId`.
const IOS_ICON_NAMES: Record<DiscreetIconId, string> = {
  AppIconCalendar: "DiscreetCalendar",
  AppIconContact: "DiscreetContact",
  AppIconFocus: "DiscreetFocus",
  AppIconMap: "DiscreetMap",
  AppIconHelp: "DiscreetHelp",
};

const toNativeIconName = (id: DiscreetIconId): string => (Capacitor.getPlatform() === "ios" ? IOS_ICON_NAMES[id] : id);

const fromNativeIconName = (name: string): DiscreetIconId => {
  if (Capacitor.getPlatform() === "ios") {
    const entry = Object.entries(IOS_ICON_NAMES).find(([, iosName]) => iosName === name);
    if (entry) return entry[0] as DiscreetIconId;
  }
  return name as DiscreetIconId;
};

export interface DiscreetIconOption {
  id: DiscreetIconId;
  previewSrc: string;
}

// Shown as the first picker tile, representing the regular (non-discreet) Pyxie Tarot icon - reuses
// the PWA manifest icon rather than a dedicated asset.
export const DEFAULT_ICON_PREVIEW_SRC = "/icons/pwa-192x192.png";

// Ids match the <activity-alias> names in android/.../AndroidManifest.xml (minus the leading dot) -
// see the comment there. Order here is the order shown in NativeSettings.tsx's picker.
export const DISCREET_ICONS: DiscreetIconOption[] = [
  { id: "AppIconCalendar", previewSrc: "/discreet-icons/calendar.png" },
  { id: "AppIconContact", previewSrc: "/discreet-icons/contact.png" },
  { id: "AppIconFocus", previewSrc: "/discreet-icons/focus.png" },
  { id: "AppIconMap", previewSrc: "/discreet-icons/map.png" },
  { id: "AppIconHelp", previewSrc: "/discreet-icons/help.png" },
];

/** Currently active icon's id, or null if the default Pyxie Tarot icon is active. */
export const getDiscreetIcon = async (): Promise<DiscreetIconId | null> => {
  const { icon } = await AppIcon.getCurrentIcon();
  return icon === null ? null : fromNativeIconName(icon);
};

/** Switches the launcher icon/label. Pass null to restore the default Pyxie Tarot one. */
export const setDiscreetIcon = async (id: DiscreetIconId | null): Promise<void> => {
  if (id === null) {
    await AppIcon.resetIcon();
  } else {
    await AppIcon.setIcon({ icon: toNativeIconName(id) });
  }
};

// Its own export (rather than an inline setTimeout) purely so DiscreetIconSettings.test.tsx can mock
// it to resolve instantly instead of eating MIN_BLOCK_MS of real wall-clock time per test.
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
