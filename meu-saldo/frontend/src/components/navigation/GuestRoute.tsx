import { Navigate, Outlet } from "react-router-dom";

import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";

export function GuestRoute() {
  const { isAuthenticated } = useAuthToken();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
