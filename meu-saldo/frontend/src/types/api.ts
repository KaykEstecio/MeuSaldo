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
  role: "user" | "admin";
  is_active: boolean;
  last_login_at: string | null;
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
  import_id: string | null;
  type: TransactionType;
  amount: string;
  description: string;
  transaction_date: string;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionImportPreviewRow = {
  row_number: number;
  transaction_date: string;
  description: string;
  amount: string;
  type: TransactionType;
  suggested_category_id: string | null;
  confidence: string;
  suggestion_reason: string;
  is_duplicate: boolean;
};

export type TransactionImportPreview = {
  filename: string;
  file_format: "csv" | "ofx";
  total_rows: number;
  duplicate_count: number;
  ready_count: number;
  rows: TransactionImportPreviewRow[];
};

export type TransactionImport = {
  id: string;
  account_id: string;
  filename: string;
  file_format: string;
  status: string;
  total_rows: number;
  imported_count: number;
  duplicate_count: number;
  skipped_count: number;
  created_at: string;
};

export type TransactionImportResult = {
  import_record: TransactionImport;
  imported_count: number;
  duplicate_count: number;
  skipped_count: number;
};

export type Budget = {
  id: string;
  category_id: string;
  category_name: string;
  month: number;
  year: number;
  limit_amount: string;
  spent_amount: string;
  remaining_amount: string;
  usage_percent: string;
  is_over_limit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source: "user" | "rules" | "external";
  feedback: "helpful" | "not_helpful" | null;
  created_at: string;
};

export type AiAssistantReply = {
  answer: string;
  source: "rules" | "external";
  disclaimer: string;
  fallback_reason: string | null;
  suggestions: string[];
  analysis_period: AiAnalysisPeriod;
  insights: AiInsight[];
  user_message: AiMessage;
  assistant_message: AiMessage;
};

export type AiAnalysisPeriod = {
  label: string;
  start_date: string;
  end_date: string;
};

export type AiInsight = {
  key: string;
  label: string;
  value: string;
  description: string;
  tone: "neutral" | "positive" | "warning" | "negative";
  href: string;
};

export type AdminMetrics = {
  total_users: number;
  new_users_this_month: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};
