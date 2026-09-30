// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardContent, LogoCard } from "@pyxie/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { homeRoute } from "@/lib/homeRoute.ts";

interface DocumentCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}

/** The shared frame for no-auth reading pages (policies, changelog, credits): one view tall, scrolling inside. */
export default function DocumentCard({ title, description, icon, children }: DocumentCardProps) {
  const { t } = useTranslation("marketing");

  return (
    <LogoCard
      title={title}
      description={description}
      icon={icon}
      className="w-2xl max-w-19/20"
      titleClassName="whitespace-nowrap text-[length:min(1.875rem,7.5vw)]"
      height="fill"
      headerExtra={
        <Link to={homeRoute()} className="text-sm text-muted-foreground underline underline-offset-4">
          {t("backToHome")}
        </Link>
      }
    >
      <CardContent className="overflow-y-auto">{children}</CardContent>
    </LogoCard>
  );
}
