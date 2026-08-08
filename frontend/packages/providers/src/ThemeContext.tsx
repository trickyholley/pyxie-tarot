// SPDX-License-Identifier: AGPL-3.0-or-later
import { UserTheme } from "@pyxie/api-client";
import { createContext } from "react";

export interface ThemeContextValue {
  theme: UserTheme;
  setTheme: (name: string) => Promise<void>;
}

export default createContext<ThemeContextValue | undefined>(undefined);
