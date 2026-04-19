import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

const STORE_PATH = join(tmpdir(), "vibehub-mock-store.json");

type StoreShape = Record<string, unknown>;

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureStoreFile() {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "{}", "utf8");
  }
}

function readStore(): StoreShape {
  ensureStoreFile();
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoreShape;
  } catch {
    return {};
  }
}

function writeStore(store: StoreShape) {
  ensureStoreFile();
  writeFileSync(STORE_PATH, JSON.stringify(store), "utf8");
}

function syncArray<T>(target: T[], next: T[]) {
  target.length = 0;
  target.push(...next);
}

const MUTATING_METHODS = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

function isObjectLike(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

function createMutableProxy<T extends Record<PropertyKey, unknown>>(
  target: T,
  persist: () => void,
  cache: WeakMap<object, unknown>
): T {
  const cached = cache.get(target);
  if (cached) {
    return cached as T;
  }

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof prop === "string" && typeof value === "function" && Array.isArray(obj) && MUTATING_METHODS.has(prop)) {
        return (...args: unknown[]) => {
          const result = (value as (...items: unknown[]) => unknown).apply(obj, args);
          persist();
          return result;
        };
      }
      if (isObjectLike(value)) {
        return createMutableProxy(value, persist, cache);
      }
      return value;
    },
    set(obj, prop, value, receiver) {
      const result = Reflect.set(obj, prop, value, receiver);
      persist();
      return result;
    },
    deleteProperty(obj, prop) {
      const result = Reflect.deleteProperty(obj, prop);
      persist();
      return result;
    },
    defineProperty(obj, prop, descriptor) {
      const result = Reflect.defineProperty(obj, prop, descriptor);
      persist();
      return result;
    },
  });

  cache.set(target, proxy);
  return proxy;
}

export function createPersistedArray<T>(key: string, seed: T[] = []): T[] {
  if (process.env.NODE_ENV !== "development") {
    return [...seed];
  }

  const target: T[] = [];
  let cache = new WeakMap<object, unknown>();

  const load = () => {
    const store = readStore();
    const rows = Array.isArray(store[key]) ? (store[key] as T[]) : seed;
    syncArray(target, cloneValue(rows));
    cache = new WeakMap<object, unknown>();
    if (!Array.isArray(store[key])) {
      store[key] = cloneValue(rows);
      writeStore(store);
    }
  };

  const save = () => {
    const store = readStore();
    store[key] = cloneValue(target);
    writeStore(store);
  };

  load();

  return new Proxy(target, {
    get(obj, prop, receiver) {
      load();
      const value = Reflect.get(obj, prop, receiver);
      if (isObjectLike(value)) {
        return createMutableProxy(value, save, cache);
      }
      return value;
    },
    set(obj, prop, value, receiver) {
      load();
      const result = Reflect.set(obj, prop, value, receiver);
      save();
      return result;
    },
    deleteProperty(obj, prop) {
      load();
      const result = Reflect.deleteProperty(obj, prop);
      save();
      return result;
    },
    defineProperty(obj, prop, descriptor) {
      load();
      const result = Reflect.defineProperty(obj, prop, descriptor);
      save();
      return result;
    },
  });
}

export function resetPersistedMockStore() {
  if (process.env.NODE_ENV !== "development") return;
  writeStore({});
}
