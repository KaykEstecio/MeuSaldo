import { Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-ink-900">
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
