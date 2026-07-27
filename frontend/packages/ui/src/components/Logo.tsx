// SPDX-License-Identifier: AGPL-3.0-or-later
import { cn } from "@ui/lib/utils";
import logo from "../assets/logo.png";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return <img src={logo} alt="Pyxie Tarot" className={cn("size-10", className)} />;
}
