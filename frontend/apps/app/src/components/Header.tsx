// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_THEME } from "@pyxie/api-client";
import { ThemeContext } from "@pyxie/providers";
import { Button, cn } from "@pyxie/ui";
import { ArrowLeft } from "lucide-react";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { HeaderConfig } from "@/lib/header.tsx";
import { PALLET_PRIDE, PRIDE_GRADIENT } from "@/lib/palletPride.ts";

export default function Header({ title, backTo }: Partial<HeaderConfig>) {
  const { t } = useTranslation("common");
  // Read the context directly rather than the useTheme() hook, like Logo.tsx - Header is rendered
  // in tests without a ThemeProvider, and should just fall back to the default look there.
  const theme = useContext(ThemeContext)?.theme ?? DEFAULT_THEME;
  const isPalletPride = theme.name === PALLET_PRIDE;

  return (
    <header
      className={cn(
        "fixed inset-x-3 top-3 z-10 flex h-10 items-center gap-2 rounded-xl bg-primary pr-14 pl-3 text-primary-foreground ring-1 ring-foreground/10",
        isPalletPride && "text-white",
      )}
      style={isPalletPride ? { background: PRIDE_GRADIENT } : undefined}
    >
      {backTo && (
        <Button
          variant="ghost"
          size="icon-xs"
          nativeButton={false}
          render={<Link to={backTo} aria-label={t("back")} />}
          className={isPalletPride ? "hover:bg-white/15" : "hover:bg-primary-foreground/15"}
        >
          <ArrowLeft />
        </Button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
    </header>
  );
}
