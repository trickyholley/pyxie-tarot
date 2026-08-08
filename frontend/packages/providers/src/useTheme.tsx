// SPDX-License-Identifier: AGPL-3.0-or-later
import { useContext } from "react";
import ThemeContext from "./ThemeContext";

export default function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
