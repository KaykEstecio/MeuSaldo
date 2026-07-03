export function formatCurrency(value: string | number, locale = "pt-BR", currency = "BRL"): string {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(numericValue);
}

export function formatPercent(value: string | number, locale = "pt-BR"): string {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function formatShortDate(value: string, locale = "pt-BR"): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(year, month - 1, day));
}

export function formatMonthLabel(year: number, month: number, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatDateTime(value: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
