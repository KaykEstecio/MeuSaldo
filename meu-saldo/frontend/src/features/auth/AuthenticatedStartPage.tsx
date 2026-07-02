import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { getCurrentUser } from "../../api/endpoints";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";
import type { User } from "../../types/api";

export function AuthenticatedStartPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((response) => {
        if (isMounted) {
          setUser(response.data);
        }
      })
      .catch((caughtError) => {
        if (!isMounted) {
          return;
        }
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
        } else {
          setError("Nao foi possivel carregar a sessao.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-ink-900">Sessao iniciada</h1>
            <p className="mt-1 text-sm text-ink-500">As telas financeiras entram nas proximas fases.</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-ink-700">
          {error ? (
            <p className="text-red-700">{error}</p>
          ) : (
            <p>{user ? `Usuario conectado: ${user.name} (${user.email})` : "Carregando usuario..."}</p>
          )}
        </div>

        <button
          type="button"
          className="mt-6 flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-700 transition hover:bg-slate-50"
          onClick={() => {
            clearToken();
            navigate(ROUTES.login, { replace: true });
          }}
        >
          <LogOut size={18} aria-hidden="true" />
          Sair
        </button>
      </div>
    </section>
  );
}
