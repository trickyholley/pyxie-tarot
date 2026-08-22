import type { LucideIcon } from "lucide-react";
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Logo } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppRoute } from "@/lib/routes.ts";

interface NoAuthPageHeaderProps {
  title: string;
  icon?: LucideIcon;
}

/** Logo + title + back-to-home link, for standalone pages under NoAuthLayout (no Layout header/back arrow there). */
export default function NoAuthPageHeader({ title, icon: Icon }: NoAuthPageHeaderProps) {
  const { t } = useTranslation("marketing");

  return (
    <div className="flex flex-col items-center gap-3 text-center mb-2">
      <Logo className="size-16" />
      <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
        {Icon && <Icon className="size-5" aria-hidden="true" />}
        {title}
      </h1>
      <Link to={AppRoute.Root} className="text-sm text-muted-foreground underline underline-offset-4">
        {t("backToHome")}
      </Link>
    </div>
  );
}
