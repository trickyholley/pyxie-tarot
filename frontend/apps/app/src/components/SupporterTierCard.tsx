// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType, ReactNode } from "react";
import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle, cn } from "@pyxie/ui";
import { Check } from "lucide-react";

interface SupporterTierCardProps {
  icon: ComponentType<{ className?: string }>;
  name: string;
  /** Rendered above `price` (issue #79's monthly/annual toggle) - omit outside the subscribe flow. */
  toggle?: ReactNode;
  /** Omit for a tier with nothing to charge (World's complimentary grant). */
  price?: string;
  blurb: string;
  /** Omit/empty for a tier with no perks worth listing (Fool). */
  features?: readonly string[];
  /** "Current plan"-style badge next to the title, for whichever tier the viewer is already on. */
  badge?: string;
  /** Subscribe/manage button, or a renews-on note - whatever fits the card's current state. */
  footer?: ReactNode;
  /** Dimmed, no footer expected - for a tier that no longer applies (Fool/Star once on World). */
  disabled?: boolean;
}

/** The card-shaped tier presentation used by SupporterSettings (issue #79) - a game-icons.net glyph as
 * a header, price, blurb, then a feature list, replacing the old single-line subscribe buttons. Sized
 * to sit two or three across in SupporterSettings' grid, not as a standalone full-width card. */
export default function SupporterTierCard({
  icon: Icon,
  name,
  toggle,
  price,
  blurb,
  features = [],
  badge,
  footer,
  disabled = false,
}: SupporterTierCardProps) {
  return (
    <Card size="sm" className={cn("h-full w-full", disabled && "opacity-50")}>
      <CardHeader className="flex flex-col items-center gap-1.5 text-center">
        <Icon className="h-8 w-8 text-primary" />
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <CardTitle>{name}</CardTitle>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        {toggle}
        {price && <p className="text-xl font-semibold">{price}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{blurb}</p>
        {features.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {footer && <CardFooter className="flex flex-col items-stretch gap-2 bg-transparent">{footer}</CardFooter>}
    </Card>
  );
}
