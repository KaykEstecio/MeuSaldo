import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { login } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";
import { AuthAlert } from "./components/AuthAlert";
import { AuthFormField } from "./components/AuthFormField";
import { AuthLayout } from "./components/AuthLayout";

type LocationState = {
  message?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuthToken();
  const state = location.state as LocationState | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      setToken(response.data.access_token);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("Nao conseguimos entrar agora. Verifique seus dados e tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Acesse seu painel financeiro"
      description="Entre para acompanhar seu saldo, suas movimentacoes e seus limites de gastos."
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <h2 className="text-2xl font-semibold text-ink-900">Entrar</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">Use o email e a senha da sua conta.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {state?.message ? <AuthAlert tone="success" message={state.message} /> : null}
          {error ? <AuthAlert tone="error" message={error} /> : null}

          <AuthFormField
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={isSubmitting}
            required
            onChange={(event) => setEmail(event.target.value)}
          />

          <div>
            <div className="relative">
              <AuthFormField
                id="login-password"
                label="Senha"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                disabled={isSubmitting}
                required
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute bottom-3 right-3 text-ink-500 transition hover:text-ink-900"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            Entrar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Ainda nao tem conta?{" "}
          <Link className="font-semibold text-brand-700 hover:text-brand-600" to={ROUTES.register}>
            Criar conta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
