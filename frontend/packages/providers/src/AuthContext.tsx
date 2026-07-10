import {createContext} from "react";

export interface AuthUser {
  id: string;
  email: string;
  // ...whatever your user shape is
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export default createContext<AuthContextValue | undefined>(undefined);
