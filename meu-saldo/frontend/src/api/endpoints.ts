import { apiRequest } from "./client";
import type {
  Account,
  AccountType,
  AdminMetrics,
  AdminUser,
  AiAssistantReply,
  AiMessage,
  ApiResponse,
  Budget,
  Category,
  CategoryType,
  DashboardSummary,
  ListResponse,
  TokenResponse,
  Transaction,
  TransactionType,
  User,
} from "../types/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export function login(payload: LoginPayload) {
  return apiRequest<ApiResponse<TokenResponse>>("/auth/login", {
    method: "POST",
    body: payload,
    withAuth: false,
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<ApiResponse<User>>("/auth/register", {
    method: "POST",
    body: payload,
    withAuth: false,
  });
}

export function getCurrentUser() {
  return apiRequest<ApiResponse<User>>("/users/me");
}

export function getAdminMetrics() {
  return apiRequest<ApiResponse<AdminMetrics>>("/admin");
}

export function listAdminUsers() {
  return apiRequest<ListResponse<AdminUser>>("/admin/users?page=1&page_size=100");
}

export type DashboardSummaryParams = {
  year?: number;
  month?: number;
};

export function getDashboardSummary(params: DashboardSummaryParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.year !== undefined) {
    searchParams.set("year", String(params.year));
  }

  if (params.month !== undefined) {
    searchParams.set("month", String(params.month));
  }

  const query = searchParams.toString();
  return apiRequest<ApiResponse<DashboardSummary>>(`/dashboard/summary${query ? `?${query}` : ""}`);
}

export type AccountPayload = {
  name: string;
  type: AccountType;
  initial_balance?: string;
};

export type AccountUpdatePayload = {
  name?: string;
  type?: AccountType;
  is_active?: boolean;
};

export function listAccounts() {
  return apiRequest<ListResponse<Account>>("/accounts?page=1&page_size=100");
}

export function createAccount(payload: AccountPayload) {
  return apiRequest<ApiResponse<Account>>("/accounts", {
    method: "POST",
    body: payload,
  });
}

export function updateAccount(accountId: string, payload: AccountUpdatePayload) {
  return apiRequest<ApiResponse<Account>>(`/accounts/${accountId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteAccount(accountId: string) {
  return apiRequest<ApiResponse<Account>>(`/accounts/${accountId}`, {
    method: "DELETE",
  });
}

export type CategoryPayload = {
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
};

export type CategoryUpdatePayload = CategoryPayload & {
  is_active?: boolean;
};

export function listCategories() {
  return apiRequest<ListResponse<Category>>("/categories?page=1&page_size=100");
}

export function createCategory(payload: CategoryPayload) {
  return apiRequest<ApiResponse<Category>>("/categories", {
    method: "POST",
    body: payload,
  });
}

export function updateCategory(categoryId: string, payload: Partial<CategoryUpdatePayload>) {
  return apiRequest<ApiResponse<Category>>(`/categories/${categoryId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteCategory(categoryId: string) {
  return apiRequest<ApiResponse<Category>>(`/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export type TransactionPayload = {
  account_id: string;
  category_id: string;
  type: TransactionType;
  amount: string;
  description: string;
  transaction_date: string;
};

export function listTransactions() {
  return apiRequest<ListResponse<Transaction>>("/transactions?page=1&page_size=100");
}

export function createTransaction(payload: TransactionPayload) {
  return apiRequest<ApiResponse<Transaction>>("/transactions", {
    method: "POST",
    body: payload,
  });
}

export function updateTransaction(transactionId: string, payload: Partial<TransactionPayload>) {
  return apiRequest<ApiResponse<Transaction>>(`/transactions/${transactionId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteTransaction(transactionId: string) {
  return apiRequest<ApiResponse<Transaction>>(`/transactions/${transactionId}`, {
    method: "DELETE",
  });
}

export type BudgetListParams = {
  month?: number;
  year?: number;
};

export type BudgetPayload = {
  category_id: string;
  month: number;
  year: number;
  limit_amount: string;
};

export function listBudgets(params: BudgetListParams = {}) {
  const searchParams = new URLSearchParams({
    page: "1",
    page_size: "100",
  });

  if (params.month !== undefined) {
    searchParams.set("month", String(params.month));
  }

  if (params.year !== undefined) {
    searchParams.set("year", String(params.year));
  }

  return apiRequest<ListResponse<Budget>>(`/budgets?${searchParams.toString()}`);
}

export function createBudget(payload: BudgetPayload) {
  return apiRequest<ApiResponse<Budget>>("/budgets", {
    method: "POST",
    body: payload,
  });
}

export function updateBudget(budgetId: string, payload: Partial<BudgetPayload>) {
  return apiRequest<ApiResponse<Budget>>(`/budgets/${budgetId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteBudget(budgetId: string) {
  return apiRequest<ApiResponse<Budget>>(`/budgets/${budgetId}`, {
    method: "DELETE",
  });
}

export type AiAssistantPayload = {
  message: string;
};

export function listAiMessages() {
  return apiRequest<ListResponse<AiMessage>>("/ai-assistant/messages?page=1&page_size=50");
}

export function createAiMessage(payload: AiAssistantPayload) {
  return apiRequest<ApiResponse<AiAssistantReply>>("/ai-assistant/messages", {
    method: "POST",
    body: payload,
  });
}
