type AuthAlertProps = {
  tone: "error" | "success";
  message: string;
};

export function AuthAlert({ tone, message }: AuthAlertProps) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <div className={`rounded-lg border px-3 py-2 text-sm ${className}`}>{message}</div>;
}
