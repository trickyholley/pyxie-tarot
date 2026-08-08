// SPDX-License-Identifier: AGPL-3.0-or-later
declare module "@pyxie/ui/styles/globals.css";
declare module "*.css";
declare module "*.svg";

declare module "virtual:changelog" {
  const entries: { version: string; date: string; message: string }[];
  export default entries;
}

/** The running app's version, from `package.json`'s `version` field — see `root.vite.config.ts`. */
declare const __VERSION__: string;
