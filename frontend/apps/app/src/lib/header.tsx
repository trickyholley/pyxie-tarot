// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect } from "react";

export interface HeaderConfig {
  title: string;
  /** Route to navigate to when the header's back arrow is clicked. Omit to hide the arrow. */
  backTo?: string;
  /** Icon shown before the title. Omit for no icon. */
  icon?: LucideIcon;
}

export const HeaderContext = createContext<((config: HeaderConfig | null) => void) | null>(null);

/** Sets Layout's header bar (title, optional icon/back arrow) while the page stays mounted, clearing it on unmount. */
export function useHeader({ title, backTo, icon }: HeaderConfig) {
  const setHeader = useContext(HeaderContext);

  useEffect(() => {
    setHeader?.({ title, backTo, icon });
    return () => setHeader?.(null);
  }, [setHeader, title, backTo, icon]);
}
