import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { AdminRoute } from "./components/navigation/AdminRoute";
import { GuestRoute } from "./components/navigation/GuestRoute";
import { ProtectedRoute } from "./components/navigation/ProtectedRoute";
import { ROUTES } from "./lib/routes";

const AdminPage = lazy(() => import("./features/admin/AdminPage").then((module) => ({ default: module.AdminPage })));
const AiAssistantPage = lazy(() =>
  import("./features/ai-assistant/AiAssistantPage").then((module) => ({ default: module.AiAssistantPage })),
);
const LoginPage = lazy(() => import("./features/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() =>
  import("./features/auth/RegisterPage").then((module) => ({ default: module.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const AccountsPage = lazy(() =>
  import("./features/finance/AccountsPage").then((module) => ({ default: module.AccountsPage })),
);
const BudgetsPage = lazy(() =>
  import("./features/finance/BudgetsPage").then((module) => ({ default: module.BudgetsPage })),
);
const CategoriesPage = lazy(() =>
  import("./features/finance/CategoriesPage").then((module) => ({ default: module.CategoriesPage })),
);
const TransactionsPage = lazy(() =>
  import("./features/finance/TransactionsPage").then((module) => ({ default: module.TransactionsPage })),
);
const SetupStatusPage = lazy(() =>
  import("./features/setup/SetupStatusPage").then((module) => ({ default: module.SetupStatusPage })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-sm font-medium text-ink-500 dark:bg-slate-950 dark:text-slate-400">
      Carregando tela...
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}
