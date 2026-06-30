import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { SetupStatusPage } from "./features/setup/SetupStatusPage";
import { ROUTES } from "./lib/routes";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={ROUTES.setup} replace />} />
        <Route path={ROUTES.setup} element={<SetupStatusPage />} />
      </Route>
    </Routes>
  );
}
