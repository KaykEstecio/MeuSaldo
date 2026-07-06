import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { register } from "../../api/endpoints";
import { ApiError } from "../../api/client";
import { ROUTES } from "../../lib/routes";
import { AuthAlert } from "./components/AuthAlert";
import { AuthFormField } from "./components/AuthFormField";
import { AuthLayout } from "./components/AuthLayout";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas precisam ser iguais.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name, email, password });
      navigate(ROUTES.login, {
        replace: true,
        state: { message: "Conta criada com sucesso. Entre para comecar a organizar suas financas." },
      });
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("Nao conseguimos criar sua conta. Verifique os campos e tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Crie sua conta financeira"
      description="Organize contas, receitas, despesas e limites mensais em um so lugar."
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <h2 className="text-2xl font-semibold text-ink-900">Criar conta</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">Informe seus dados para criar seu acesso.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? <AuthAlert tone="error" message={error} /> : null}

          <AuthFormField
            id="register-name"
            label="Nome"
            type="text"
            autoComplete="name"
            value={name}
            disabled={isSubmitting}
            required
            minLength={2}
            onChange={(event) => setName(event.target.value)}
          />

          <AuthFormField
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            disabled={isSubmitting}
            required
            onChange={(event) => setEmail(event.target.value)}
          />

          <div className="relative">
            <AuthFormField
              id="register-password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

          <AuthFormField
            id="register-confirm-password"
            label="Confirmar senha"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isSubmitting}
            required
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
            Criar conta
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Ja tem conta?{" "}
          <Link className="font-semibold text-brand-700 hover:text-brand-600" to={ROUTES.login}>
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
