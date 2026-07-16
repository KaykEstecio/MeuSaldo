import { Navigate, Outlet } from "react-router-dom";

import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";

export function GuestRoute() {
  const { isAuthenticated, isReady } = useAuthToken();

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center">Verificando sessao...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
