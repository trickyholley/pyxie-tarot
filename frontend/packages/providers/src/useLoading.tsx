// SPDX-License-Identifier: AGPL-3.0-or-later
import { useContext } from "react";
import LoadingContext from "./LoadingContext";

export default function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return ctx;
}
