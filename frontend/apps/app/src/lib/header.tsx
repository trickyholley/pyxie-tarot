// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, useContext, useEffect } from "react";

export interface HeaderConfig {
  title: string;
  /** Route to navigate to when the header's back arrow is clicked. Omit to hide the arrow. */
  backTo?: string;
}

export const HeaderContext = createContext<((config: HeaderConfig | null) => void) | null>(null);

/** Sets Layout's header bar (title, optional back arrow) while the page stays mounted, clearing it on unmount. */
export function useHeader({ title, backTo }: HeaderConfig) {
  const setHeader = useContext(HeaderContext);

  useEffect(() => {
    setHeader?.({ title, backTo });
    return () => setHeader?.(null);
  }, [setHeader, title, backTo]);
}
