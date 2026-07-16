import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAuthToken();

  if (!isReady) {
    return <div className="flex min-h-screen items-center justify-center">Restaurando sessao...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
