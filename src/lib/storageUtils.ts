/**
 * Safe LocalStorage and SessionStorage wrappers with fallback for restricted/sandboxed iframes.
 */

const memoryStorage = new Map<string, string>();
const memorySessionStorage = new Map<string, string>();

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (_) {}
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    memoryStorage.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (_) {}
    memoryStorage.clear();
  },
  getAllKeys: (): string[] => {
    const keys = new Set<string>();
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      }
    } catch (_) {}
    for (const k of memoryStorage.keys()) {
      keys.add(k);
    }
    return Array.from(keys);
  },
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (_) {}
    return memorySessionStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (_) {}
    memorySessionStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    memorySessionStorage.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.clear();
        return;
      }
    } catch (_) {}
    memorySessionStorage.clear();
  },
  getAllKeys: (): string[] => {
    const keys = new Set<string>();
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k) keys.add(k);
        }
      }
    } catch (_) {}
    for (const k of memorySessionStorage.keys()) {
      keys.add(k);
    }
    return Array.from(keys);
  },
};

export const safeHistory = {
  pushState: (data: any, unused: string, url?: string | URL | null): void => {
    try {
      if (typeof window !== "undefined" && window.history) {
        window.history.pushState(data, unused, url);
      }
    } catch (err) {
      console.warn("[safeHistory] pushState restricted:", err);
    }
  },
  replaceState: (data: any, unused: string, url?: string | URL | null): void => {
    try {
      if (typeof window !== "undefined" && window.history) {
        window.history.replaceState(data, unused, url);
      }
    } catch (err) {
      console.warn("[safeHistory] replaceState restricted:", err);
    }
  },
};

export const safeClipboardWrite = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  } catch (_) {}

  return false;
};
