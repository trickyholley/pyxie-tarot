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
  titleClassName?: string;
  /**
   * - `"screen"`: pads a standalone page out to full viewport height.
   * - `"content"`: sizes to the card, for layouts that already manage height and a footer (e.g. `NoAuthLayout`).
   * - `"fill"`: caps the card at its parent's height so long content scrolls inside the card, not the page. Marks
   *   itself `data-fill-parent`, which `NoAuthLayout` watches for to give the page a definite height.
   */
  height?: "screen" | "content" | "fill";
  children?: ReactNode;
}

export default function LogoCard({
  title,
  description,
  icon: Icon,
  headerExtra,
  className,
  titleClassName,
  height = "screen",
  children,
}: LogoCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-8",
        height === "screen" && "min-h-dvh",
        height === "fill" && "h-full",
      )}
      data-fill-parent={height === "fill" || undefined}
    >
      <Card className={cn("w-full max-w-sm gap-4 sm:max-w-md", height === "fill" && "max-h-full", className)}>
        <div className="flex justify-center">
          <img src={logo} alt="Pyxie Tarot" className="size-18" />
        </div>
        <CardHeader className={headerExtra ? "text-center" : undefined}>
          <CardTitle
            className={cn("flex items-center gap-2 text-3xl", headerExtra && "justify-center", titleClassName)}
          >
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
