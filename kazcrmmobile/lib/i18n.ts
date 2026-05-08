export const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  resolved: "Решена",
  closed: "Закрыта",
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: "Критический",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export const CATEGORY_LABELS: Record<string, string> = {
  technical_issue: "Техническая проблема",
  billing: "Оплата",
  general_inquiry: "Общий вопрос",
  account_access: "Доступ к аккаунту",
  integration: "Интеграция",
  feature_request: "Запрос функции",
  complaint: "Жалоба",
  urgent_outage: "Критический сбой",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  operator: "Оператор",
};

export const statusLabel = (s?: string | null) =>
  (s && STATUS_LABELS[s]) || s || "—";

export const priorityLabel = (p?: string | null) =>
  (p && PRIORITY_LABELS[p]) || p || "—";

export const categoryLabel = (c?: string | null) =>
  (c && CATEGORY_LABELS[c]) || c || "—";

export const roleLabel = (r?: string | null) =>
  (r && ROLE_LABELS[r]) || r || "—";
