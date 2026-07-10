import {useEffect} from "react";
import useAuth from "./useAuth";

export default function useRequireAuth(redirectTo = "/login") {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = redirectTo;
    }
  }, [loading, user, redirectTo]);

  return { user, loading };
}
