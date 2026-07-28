// SPDX-License-Identifier: AGPL-3.0-or-later
import { LoadingContext } from "@pyxie/providers";
import { cn } from "@ui/lib/utils";
import { useContext } from "react";
import logo from "../assets/logo.svg";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  // Logo is rendered from many trees (including ones with no LoadingProvider, e.g. tests),
  // so read the context directly instead of useLoading()'s "must be wrapped" hook.
  const isLoading = useContext(LoadingContext)?.isLoading ?? false;

  return (
    <img
      src={logo}
      alt="Pyxie Tarot"
      className={cn(
        "size-10 transition-opacity duration-700",
        isLoading ? "animate-logo-active opacity-100" : "animate-logo-idle opacity-40",
        className,
      )}
    />
  );
}
