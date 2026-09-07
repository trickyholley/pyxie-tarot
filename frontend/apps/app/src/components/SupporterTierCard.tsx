// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ComponentType, ReactNode } from "react";
import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle, cn } from "@pyxie/ui";
import { Check, HandHeart } from "lucide-react";

interface SupporterTierCardProps {
  icon: ComponentType<{ className?: string }>;
  name: string;
  /** Omit for a tier with nothing to charge (World's complimentary grant). */
  price?: string;
  /** Small note below `price` (e.g. an annual-billing savings callout) - omit for none. */
  priceNote?: string;
  blurb: string;
  /** Omit/empty for a tier with no perks worth listing (Fool). */
  features?: readonly string[];
  /** "Current plan"-style text for whichever tier the viewer is already on - shown as a pill pinned to
   * the card's top-left corner, and also what draws the card's highlighted ring. Omit for a tier that
   * isn't the viewer's. */
  currentLabel?: string;
  /** Subscribe/manage button, or a renews-on note - whatever fits the card's current state. */
  footer?: ReactNode;
  /** Dimmed, no footer expected - for a tier that no longer applies (Fool/Star once on World). */
  disabled?: boolean;
}

/** The card-shaped tier presentation used by SupporterSettings (issue #79) - a game-icons.net glyph as
 * a header, price, blurb, then a feature list, replacing the old single-line subscribe buttons. Stacked
 * full-width in SupporterSettings, sized to its own content rather than a uniform height. */
export default function SupporterTierCard({
  icon: Icon,
  name,
  price,
  priceNote,
  blurb,
  features = [],
  currentLabel,
  footer,
  disabled = false,
}: SupporterTierCardProps) {
  return (
    <Card size="sm" className={cn("relative w-full", currentLabel && "ring-2 ring-primary", disabled && "opacity-50")}>
      {currentLabel && (
        <Badge className="absolute top-3 left-3">
          <HandHeart data-icon="inline-start" />
          {currentLabel}
        </Badge>
      )}
      {/* pt-8 when there's a pill clears it regardless of label length/locale, rather than relying on
       * the centered icon happening to leave enough room beside it. */}
      <CardHeader className={cn("flex flex-col items-center gap-1.5 text-center", currentLabel && "pt-8")}>
        <Icon className="h-16 w-16 text-primary" />
        <CardTitle>{name}</CardTitle>
        {price && <p className="text-xl font-semibold">{price}</p>}
        {priceNote && <p className="text-xs text-muted-foreground">{priceNote}</p>}
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
