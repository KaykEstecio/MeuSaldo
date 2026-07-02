export type ApiResponse<T> = {
  data: T;
  message: string;
};

export type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type ListResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};

export type User = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
};

export type DashboardPeriod = {
  year: number;
  month: number;
  start_date: string;
  end_date: string;
};

export type DashboardCategoryExpense = {
  category_id: string | null;
  category_name: string;
  amount: string;
};

export type DashboardCashflowPoint = {
  date: string;
  income: string;
  expense: string;
  net: string;
};

export type DashboardSummary = {
  period: DashboardPeriod;
  total_balance: string;
  monthly_income: string;
  monthly_expense: string;
  monthly_net: string;
  active_accounts: number;
  transactions_count: number;
  expense_by_category: DashboardCategoryExpense[];
  cashflow_by_day: DashboardCashflowPoint[];
};

export type AccountType = "checking" | "savings" | "cash" | "credit_card" | "investment" | "other";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: string;
  current_balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: string;
  description: string;
  transaction_date: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
