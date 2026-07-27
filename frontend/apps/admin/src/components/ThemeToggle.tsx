// SPDX-License-Identifier: AGPL-3.0-or-later
import { Switch } from "@pyxie/ui";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className="flex items-center gap-1.5">
      <Sun className="size-4" />
      <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
      <Moon className="size-4" />
    </label>
  );
}
