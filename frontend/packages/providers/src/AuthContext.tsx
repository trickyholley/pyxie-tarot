// SPDX-License-Identifier: AGPL-3.0-or-later
import { User } from "@pyxie/api-client";
import { createContext } from "react";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  // refreshToken is app-only - admin has no refresh flow.
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
  // Patches the in-memory user (e.g. after a profile field is updated server-side) without a re-fetch.
  updateUser: (patch: Partial<User>) => void;
  // Re-reads the user from the server, for state this app never writes itself - currently the billing
  // licence, which changes via a Gumroad webhook while the customer is away on Gumroad's own pages. Resolves
  // to the fresh user (or null if the re-read failed), so callers can diff against what they had.
  refreshUser: () => Promise<User | null>;
}

export default createContext<AuthContextValue | undefined>(undefined);
