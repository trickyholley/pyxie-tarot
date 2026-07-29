// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@ui/lib/utils";
import logo from "../assets/logo.svg";

interface CardBackProps {
  className?: string;
  opacity?: number;
}

// Recreates backend/scripts/generate_card_back.py as a resolution-independent SVG (purple radial
// gradient, double gold border, centered logo) so the card back never waits on a raster image load
// and can't flash the wrong background color while it does.
export default function CardBack({ className, opacity }: CardBackProps) {
  return (
    <div className={cn("relative h-full w-full", className)} style={opacity !== undefined ? { opacity } : undefined}>
      <svg viewBox="0 0 500 800" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="pyxie-card-back-bg" cx="50%" cy="50%" r="70.7107%">
            <stop offset="0%" stopColor="#7d5880" />
            <stop offset="100%" stopColor="#3a283e" />
          </radialGradient>
        </defs>
        <rect width="500" height="800" fill="url(#pyxie-card-back-bg)" />
        <rect x="24" y="24" width="452" height="752" fill="none" stroke="#a6988a" strokeWidth="4" />
        <rect x="36" y="36" width="428" height="728" fill="none" stroke="#a6988a" strokeWidth="1" />
      </svg>
      <img src={logo} alt="" className="absolute top-1/2 left-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
