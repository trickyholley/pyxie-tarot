// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from "@pyxie/ui";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { HeaderConfig } from "@/lib/header.tsx";

export default function Header({ title, backTo }: Partial<HeaderConfig>) {
  const { t } = useTranslation("common");
  return (
    <header className="fixed inset-x-3 top-3 z-10 flex h-10 items-center gap-2 rounded-xl bg-card pr-14 pl-3 ring-1 ring-foreground/10">
      {backTo && (
        <Button
          variant="ghost"
          size="icon-xs"
          nativeButton={false}
          render={<Link to={backTo} aria-label={t("back")} />}
        >
          <ArrowLeft />
        </Button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
    </header>
  );
}
