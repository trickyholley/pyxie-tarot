// SPDX-License-Identifier: AGPL-3.0-or-later
import { Capacitor, registerPlugin } from "@capacitor/core";

interface LocalFilePlugin {
  read(options: { uri?: string }): Promise<{ base64: string }>;
}

// Registered lazily, like nativeAuthBridge.ts - tests mock "@capacitor/core" without stubbing registerPlugin.
let localFile: LocalFilePlugin | undefined;

/** A camera/gallery result's image. iOS can't `fetch` its capacitor:// `webPath` from the page's https origin, so
 * the iOS shell reads its `uri` natively instead (LocalFilePlugin.swift). */
export async function readPhoto({ uri, webPath }: { uri?: string; webPath: string }): Promise<Blob> {
  if (Capacitor.getPlatform() !== "ios") return (await fetch(webPath)).blob();

  localFile ??= registerPlugin<LocalFilePlugin>("LocalFile");
  const { base64 } = await localFile.read({ uri });
  return new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], { type: "image/jpeg" });
}
