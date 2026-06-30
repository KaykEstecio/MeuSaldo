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
