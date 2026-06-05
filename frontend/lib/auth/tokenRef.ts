/** In-memory token для API-запросов без импорта zustand store (избегаем циклов webpack). */
let token: string | null = null;

export function setTokenRef(value: string | null) {
  token = value;
}

export function getTokenRef(): string | null {
  return token;
}

export function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
