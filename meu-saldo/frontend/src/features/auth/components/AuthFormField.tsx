import type { InputHTMLAttributes } from "react";

type AuthFormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function AuthFormField({ label, id, ...props }: AuthFormFieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <input
        id={id}
        className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        {...props}
      />
    </label>
  );
}
