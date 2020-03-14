export type CacheBuilder = (...args: any[]) => string;

export interface Options<TReturn> {
  cache: () => {
    get: (key: string) => TReturn | undefined;
    has: (key: string) => boolean;
    set: (key: string, value: TReturn) => any;
    delete: (key: string) => any;
    clear?: () => any;
  };
  maxAge: number;
  cacheKey: CacheBuilder;
  valueAccept: ((error: unknown | null, result: TReturn) => boolean) | null;
}

const defaultCacheKeyBuilder: CacheBuilder = (...args) =>
  args.length === 0 ? "__0aritykey__" : JSON.stringify(args);
const isPromise = (value: Promise<unknown> | unknown): boolean =>
  value instanceof Promise;

const memoizy = <TReturn>(
  fn: (...args: any[]) => TReturn,
  {
    cache: cacheFactory = (): Map<string, TReturn> =>
      new Map<string, TReturn>(),
    maxAge = Infinity,
    cacheKey = defaultCacheKeyBuilder,
    valueAccept = null
  }: Options<TReturn> = {
    cache: (): Map<string, TReturn> => new Map<string, TReturn>(),
    maxAge: Infinity,
    cacheKey: defaultCacheKeyBuilder,
    valueAccept: null
  }
): ((...args: any[]) => TReturn) => {
  const hasExpireDate = maxAge > 0 && maxAge < Infinity;
  const cache = cacheFactory();

  const set = (key: string, value: TReturn): void => {
    if (hasExpireDate) {
      setTimeout(() => {
        cache.delete(key);
      }, maxAge);
    }
    cache.set(key, value);
  };

  const memoized = (...args: any[]): TReturn => {
    const key = cacheKey(...args);
    if (cache.has(key)) {
      return cache.get(key) as TReturn;
    }
    const value = fn(...args);

    if (!valueAccept) {
      set(key, value);
    } else if (isPromise(value)) {
      ((value as unknown) as Promise<unknown>)
        .then(res => [null, res])
        .catch(err => [err])
        .then(([err, res]) => {
          if (valueAccept(err, res)) {
            set(key, value);
          }
        });
    } else if (valueAccept(null, value)) {
      set(key, value);
    }

    return value;
  };

  memoized.delete = (...args: any[]): any => cache.delete?.(cacheKey(...args));
  memoized.clear = (): void => {
    if (cache.clear instanceof Function) {
      cache.clear();
    } else {
      throw new Error("This cache doesn't support clear");
    }
  };

  return memoized;
};

export default memoizy;