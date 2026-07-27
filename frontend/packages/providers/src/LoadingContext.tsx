// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext } from "react";

export interface LoadingContextValue {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  pulseLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
}

export default createContext<LoadingContextValue | undefined>(undefined);
