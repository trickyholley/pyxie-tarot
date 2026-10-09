// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor, registerPlugin } from "@capacitor/core";

const PLAY_STORE_INSTALLER = "com.android.vending";

interface InstallSourcePlugin {
  getInstaller(): Promise<{ installer: string | null }>;
}

const InstallSource = registerPlugin<InstallSourcePlugin>("InstallSource");
let installedFromPlay = false;

export const isInstalledFromPlay = (): boolean => installedFromPlay;

export async function loadInstallSource(): Promise<void> {
  if (!Capacitor.isPluginAvailable("InstallSource")) return;
  const { installer } = await InstallSource.getInstaller();
  installedFromPlay = installer === PLAY_STORE_INSTALLER;
}
