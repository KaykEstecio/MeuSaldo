import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated } = useAuthToken();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
