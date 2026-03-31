const KEY = "diagravinci_gemini_key";

export const getApiKey = (): string | null => localStorage.getItem(KEY);
export const setApiKey = (k: string): void => localStorage.setItem(KEY, k);
export const clearApiKey = (): void => localStorage.removeItem(KEY);
