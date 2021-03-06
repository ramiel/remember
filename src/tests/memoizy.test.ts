/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-env jest */

import {
  CacheWithTimer,
  GenericCache,
  memoizy as memoizer,
} from '../memoizy';

jest.useFakeTimers();

describe('memoizer', () => {
  describe('basic', () => {
    test('a simple function, 0-arity, is memoized', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn);
      const res = mem();
      expect(mem()).toBe(res);
    });

    test('a simple function, 1-arity, is memoized', () => {
      const fn = jest.fn(a => a + 1);
      const mem = memoizer(fn);
      mem(2);
      mem(2);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem(3)).toBe(4);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('a function with a string arg, 1-arity, is memoized', () => {
      const fn = jest.fn(a => `hello ${a}`);
      const mem = memoizer(fn);
      mem('John');
      mem('John');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem('Carl')).toBe('hello Carl');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('a function with a promise arg, 1-arity, is memoized', async () => {
      const fn = jest.fn(async a => `hello ${a}`);
      const mem = memoizer(fn);
      await mem('John');
      await mem('John');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(await mem('Carl')).toBe('hello Carl');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('a function with an undefined arg, 1-arity, is memoized', () => {
      const fn = jest.fn((a?: string) => `hello ${a}`);
      const mem = memoizer(fn);
      mem();
      mem();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem('Carl')).toBe('hello Carl');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('two functions with an undefined arg, 1-arity, are memoized indipendently', () => {
      const fn = jest.fn((a?: string) => `hello ${a}`);
      const fn2 = jest.fn((a?: string) => `ciao ${a}`);
      const mem = memoizer(fn);
      const mem2 = memoizer(fn2);
      mem();
      mem();
      mem2();
      mem2();
      expect(mem()).toBe('hello undefined');
      expect(mem2()).toBe('ciao undefined');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    test('a function with an object arg, 1-arity, is memoized', () => {
      const fn = jest.fn(a => JSON.stringify(a));
      const mem = memoizer(fn);
      const res = mem({ name: 'John' });
      mem({ name: 'John' });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem({ name: 'John' })).toEqual(res);
      expect(mem({ name: 'Ludwig' })).toBe(
        JSON.stringify({ name: 'Ludwig' }),
      );
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('a simple function, 2-arity, is memoized', () => {
      const fn = jest.fn((a, b) => a + b);
      const mem = memoizer(fn);
      mem(2, 3);
      mem(2, 3);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem(3, 4)).toBe(7);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('a simple function, n-arity, is memoized', () => {
      const fn = jest.fn((...args) =>
        args.reduce((sum, n) => sum + n, 0),
      );
      const mem = memoizer(fn);
      mem(1, 2, 3, 4);
      mem(1, 2, 3, 4);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('max age', () => {
    beforeEach(() => {
      jest.clearAllTimers();
    });

    test('by default no value is discarded', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn);
      const res = mem();
      jest.advanceTimersByTime(1000 * 1000);
      expect(mem()).toBe(res);
    });

    test('when max-age is set, the value is not discarded before the time', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, { maxAge: 1000 });
      const res = mem();
      jest.advanceTimersByTime(990);
      expect(mem()).toBe(res);
    });

    test('when max-age is set, the value is NOT discarded before the time (shifted first set)', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, { maxAge: 1000 });
      jest.advanceTimersByTime(200);
      const res = mem();
      jest.advanceTimersByTime(900);
      expect(mem()).toBe(res);
      jest.advanceTimersByTime(101);
      expect(mem()).not.toBe(res);
    });

    test('when max-age is set, the value is discarded after the time', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, { maxAge: 1000 });
      const res = mem();
      jest.advanceTimersByTime(1001);
      expect(mem()).not.toBe(res);
    });

    test('when max-age is 0, the value is memoized forever', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, { maxAge: 0 });
      const res = mem();
      jest.advanceTimersByTime(10000);
      expect(mem()).toBe(res);
    });

    test('when max-age is less than 0, the value is memoized forever', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, { maxAge: -10 });
      const res = mem();
      jest.advanceTimersByTime(10000);
      expect(mem()).toBe(res);
    });
  });

  describe('cacheKey custom function', () => {
    test('same memoization for odd values', () => {
      const fn = jest.fn((a: number) => `hello ${a}`);
      const mem = memoizer(fn, {
        cacheKey: a => {
          if (a % 2 !== 0) {
            return 'odd';
          }
          return a;
        },
      });
      mem(3);
      mem(5);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mem(5)).toBe('hello 3');
      expect(mem(4)).toBe('hello 4');
      expect(mem(6)).toBe('hello 6');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('valueAccept function', () => {
    test('skip not accepted value', () => {
      const fn = jest.fn(a => a > 10);
      const mem = memoizer(fn, { valueAccept: (_, v) => v === true });
      mem(5);
      mem(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retain accepted value', () => {
      const fn = jest.fn(a => a > 10);
      const mem = memoizer(fn, { valueAccept: (_, v) => v === true });
      mem(12);
      mem(12);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('can skip a rejected promise', async () => {
      const fn = jest.fn(async () => {
        throw new Error();
      });
      const mem = memoizer(fn, { valueAccept: err => !err });
      await mem().catch(() => {});
      await mem().catch(() => {});
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test.skip('can keep a rejected promise', async () => {
      const fn = jest.fn(async () => {
        throw new Error();
      });
      const mem = memoizer(fn, { valueAccept: () => true });
      await mem().catch(() => {});
      await mem().catch(() => {});
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test.skip('can retain a fullfilled promise', async () => {
      const fn = jest.fn(async a => a * 2);
      const mem = memoizer(fn, { valueAccept: err => !err });
      await mem(11);
      await mem(11);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('can skip a fullfilled promise', async () => {
      const fn = jest.fn(async a => a * 2);
      const mem = memoizer(fn, { valueAccept: () => false });
      await mem(11);
      await mem(11);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Delete', () => {
    test('can delete a simple function, 0-arity', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn);
      const res = mem();
      mem.delete();
      expect(mem()).not.toBe(res);
    });

    test('can delete a simple function, 1-arity', () => {
      const fn = (a: number) => a + Math.random();
      const mem = memoizer(fn);
      const res = mem(2);
      mem.delete(2);
      expect(mem(2)).not.toBe(res);
    });

    test('can delete a simple function, 1-arity, with an object', () => {
      const fn = jest.fn(a => ({ ...a, rand: Math.random() }));
      const mem = memoizer(fn);
      const res = mem({ hello: 'darkness' });
      mem.delete({ hello: 'darkness' });
      expect(mem({ hello: 'darkness' })).not.toEqual(res);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('can delete a simple function, n-arity', () => {
      const fn = jest.fn((...args) =>
        args.reduce((sum, n) => sum + n, 0),
      );
      const mem = memoizer(fn);
      mem(1, 2, 3, 4);
      mem.delete(1, 2, 3, 4);
      mem(1, 2, 3, 4);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Clear', () => {
    test('can clear all the memoized values', () => {
      const fn = jest.fn(a => a + Math.random());
      const mem = memoizer(fn);
      mem(1);
      mem(2);
      mem(1);
      mem(2);
      mem.clear();
      mem(1);
      mem(2);
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('Custom cache', () => {
    const AlternativeCache = () => {
      let data: { [key: string]: unknown } = {};
      const cache: GenericCache<string, unknown> = {
        has(key) {
          return key in data;
        },
        get(key) {
          return data[key];
        },
        set(key, value) {
          data[key] = value;
        },
        delete(key) {
          delete data[key];
          return true;
        },
        clear() {
          data = {};
        },
      };
      return cache;
    };

    test('can use another cache', () => {
      const aletrnativeCache = AlternativeCache();
      const spyGet = jest.spyOn(aletrnativeCache, 'get');
      const fn = jest.fn(a => a * 2);
      const memFn = memoizer(fn, { cache: () => aletrnativeCache });
      memFn(3);
      const res = memFn(3);
      expect(res).toBe(6);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(spyGet).toHaveBeenCalledTimes(1);
    });

    test('can delete with custom cache', () => {
      const fn = Math.random;
      const mem = memoizer(fn, { cache: AlternativeCache });
      const res = mem();
      mem.delete();
      expect(mem()).not.toBe(res);
    });

    test('can use a cache wihtout clear', () => {
      const fn = jest.fn(obj => ({ ...obj, date: new Date() }));
      const memFn = memoizer(fn, {
        cache: (): GenericCache<object, unknown> => new WeakMap(),
        cacheKey: o => o,
      });
      const obj = { hello: 'world' };
      const res1 = memFn(obj);
      const res2 = memFn(obj);
      expect(res1).toEqual(
        expect.objectContaining({
          hello: 'world',
          date: expect.any(Date),
        }),
      );
      expect(res1).toBe(res2);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(() => memFn.clear()).toThrow();
    });
  });

  describe('Cache with expiration mechanism', () => {
    const AutoDeleteCache = () => {
      let data: { [key: string]: unknown } = {};
      const cache: CacheWithTimer<string, unknown> = {
        has(key) {
          return key in data;
        },
        get(key) {
          return data[key];
        },
        set(key, value, expiration) {
          if (expiration) {
            setTimeout(() => {
              cache.delete(key);
            }, expiration);
          }
          data[key] = value;
        },
        delete(key) {
          delete data[key];
          return true;
        },
        clear() {
          data = {};
        },
      };
      return cache;
    };

    beforeEach(() => {
      jest.clearAllTimers();
    });

    test('by default no value is discarded', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      const res = mem();
      jest.advanceTimersByTime(1000 * 1000);
      expect(mem()).toBe(res);
    });

    test('when max-age is set, the value is not discarded before the time', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        maxAge: 1000,
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      const res = mem();
      jest.advanceTimersByTime(990);
      expect(mem()).toBe(res);
    });

    test('when max-age is set, the value is NOT discarded before the time (shifted first set)', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        maxAge: 1000,
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      jest.advanceTimersByTime(200);
      const res = mem();
      jest.advanceTimersByTime(900);
      expect(mem()).toBe(res);
      jest.advanceTimersByTime(101);
      expect(mem()).not.toBe(res);
    });

    test('when max-age is set, the value is discarded after the time', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        maxAge: 1000,
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      const res = mem();
      jest.advanceTimersByTime(1001);
      expect(mem()).not.toBe(res);
    });

    test('when max-age is 0, the value is memoized forever', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        maxAge: 0,
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      const res = mem();
      jest.advanceTimersByTime(10000);
      expect(mem()).toBe(res);
    });

    test('when max-age is less than 0, the value is memoized forever', () => {
      const fn = () => Math.random();
      const mem = memoizer(fn, {
        maxAge: -10,
        cache: AutoDeleteCache,
        cacheHandlesExpiration: true,
      });
      const res = mem();
      jest.advanceTimersByTime(10000);
      expect(mem()).toBe(res);
    });
  });
});
