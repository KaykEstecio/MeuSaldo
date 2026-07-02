import type { AccountType, CategoryType, TransactionType } from "../types/api";

export const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupanca",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  investment: "Investimento",
  other: "Outra",
};

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};
