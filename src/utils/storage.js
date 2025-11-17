const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const storage = {
  get(key, defaultValue = null) {
    if (!isBrowser) return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? defaultValue : safeParse(raw);
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    if (!isBrowser) return false;
    try {
      const toStore = typeof value === 'string' ? value : JSON.stringify(value);
      window.localStorage.setItem(key, toStore);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    if (!isBrowser) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};
