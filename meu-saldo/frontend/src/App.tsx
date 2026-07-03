import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { AdminRoute } from "./components/navigation/AdminRoute";
import { GuestRoute } from "./components/navigation/GuestRoute";
import { ProtectedRoute } from "./components/navigation/ProtectedRoute";
import { AdminPage } from "./features/admin/AdminPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { AiAssistantPage } from "./features/ai-assistant/AiAssistantPage";
import { AccountsPage } from "./features/finance/AccountsPage";
import { BudgetsPage } from "./features/finance/BudgetsPage";
import { CategoriesPage } from "./features/finance/CategoriesPage";
import { TransactionsPage } from "./features/finance/TransactionsPage";
import { SetupStatusPage } from "./features/setup/SetupStatusPage";
import { ROUTES } from "./lib/routes";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={ROUTES.login} replace />} />
        <Route path={ROUTES.setup} element={<SetupStatusPage />} />
        <Route element={<GuestRoute />}>
          <Route path={ROUTES.login} element={<LoginPage />} />
          <Route path={ROUTES.register} element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.accounts} element={<AccountsPage />} />
          <Route path={ROUTES.categories} element={<CategoriesPage />} />
          <Route path={ROUTES.transactions} element={<TransactionsPage />} />
          <Route path={ROUTES.budgets} element={<BudgetsPage />} />
          <Route path={ROUTES.aiAssistant} element={<AiAssistantPage />} />
        </Route>
        <Route element={<AdminRoute />}>
          <Route path={ROUTES.admin} element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
