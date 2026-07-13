import {User} from "@pyxie/api-client";
import {createContext} from "react";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export default createContext<AuthContextValue | undefined>(undefined);
