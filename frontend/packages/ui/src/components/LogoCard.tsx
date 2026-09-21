// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import logo from "../assets/logo.svg";
import { cn } from "../lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "./base-ui";

interface LogoCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Rendered below the title/description, e.g. a back-to-home link. Left generic (not a fixed
   * `backTo` prop) so this stays router-agnostic - it's shared by both apps. */
  headerExtra?: ReactNode;
  /** Overrides the card's width/spacing for pages wider than the default auth-form sizing. */
  className?: string;
  /** Set false when this card is nested inside a layout that already manages full-viewport height
   * and its own footer (e.g. `NoAuthLayout`), so this card doesn't force extra `min-h-dvh` on top of it. */
  fullHeight?: boolean;
  children?: ReactNode;
}

export default function LogoCard({
  title,
  description,
  icon: Icon,
  headerExtra,
  className,
  fullHeight = true,
  children,
}: LogoCardProps) {
  return (
    <div className={cn("flex items-center justify-center px-4 py-8", fullHeight && "min-h-dvh")}>
      <Card className={cn("w-full max-w-sm gap-4 sm:max-w-md", className)}>
        <div className="flex justify-center">
          <img src={logo} alt="Pyxie Tarot" className="size-18" />
        </div>
        <CardHeader className={headerExtra ? "text-center" : undefined}>
          <CardTitle className={cn("flex items-center gap-2 text-3xl", headerExtra && "justify-center")}>
            {Icon && <Icon className="size-6" aria-hidden="true" />}
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          {headerExtra}
        </CardHeader>
        {children}
      </Card>
    </div>
  );
}
