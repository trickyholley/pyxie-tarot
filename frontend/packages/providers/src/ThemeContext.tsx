// SPDX-License-Identifier: AGPL-3.0-or-later
import { ThemeColors, UserTheme } from "@pyxie/api-client";
import { createContext } from "react";

export interface ThemeContextValue {
  theme: UserTheme;
  setTheme: (name: string, colors?: ThemeColors | null, frosted?: boolean) => Promise<void>;
}

export default createContext<ThemeContextValue | undefined>(undefined);
