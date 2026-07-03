import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { ApiError } from "../../api/client";
import { getCurrentUser } from "../../api/endpoints";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";
import type { User } from "../../types/api";

type Status = "loading" | "allowed" | "denied";

export function AdminRoute() {
  const location = useLocation();
  const { clearToken, isAuthenticated } = useAuthToken();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function validateAdmin() {
      if (!isAuthenticated) {
        setStatus("denied");
        return;
      }

      try {
        const response = await getCurrentUser();
        if (!isMounted) {
          return;
        }

        setUser(response.data);
        setStatus(response.data.role === "admin" ? "allowed" : "denied");
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiError && caughtError.status === 401) {
          clearToken();
        }

        setStatus("denied");
      }
    }

    void validateAdmin();

    return () => {
      isMounted = false;
    };
  }, [clearToken, isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-ink-500">
        <Loader2 className="mr-2 animate-spin" size={20} aria-hidden="true" />
        Carregando acesso
      </div>
    );
  }

  if (status === "denied" || user?.role !== "admin") {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
