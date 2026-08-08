// SPDX-License-Identifier: AGPL-3.0-or-later
import { User } from "@pyxie/api-client";
import { createContext } from "react";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  // Patches the in-memory user (e.g. after a profile field is updated server-side) without a re-fetch.
  updateUser: (patch: Partial<User>) => void;
}

export default createContext<AuthContextValue | undefined>(undefined);
