import { typeGetter } from '../src/index';

describe('type getter', () => {
  const resolveTypes = typeGetter(__dirname);

  it('can resolve primitives', () => {
    const resolved = resolveTypes`
      type T1 = string;
      type T2 = boolean;
      type T3 = number;
      type T4 = undefined;
      type T5 = null;
    `;

    expect(resolved).toMatchInlineSnapshot(`
      "type T1 = string;
      type T2 = boolean;
      type T3 = number;
      type T4 = undefined;
      type T5 = null;
      "
    `);
  });

  it('can resolve utility types', () => {
    const resolved = resolveTypes`
      interface Foo {
        name: string;
        age: number;
        enabled: boolean;
      }

      type T1 = Foo;
      type T2 = Partial<Foo>;
      type T3 = Pick<Foo, 'name' | 'age'>;
    `;

    expect(resolved).toMatchInlineSnapshot(`
      "type T1 = Foo;
      type T2 = {
        name?: string | undefined;
        age?: number | undefined;
        enabled?: boolean | undefined;
      };
      type T3 = { name: string; age: number };
      "
    `);
  });

  it('can resolve record types', () => {
    const resolved = resolveTypes`
      type T1 = 'foo' | 'bar' | 'baz';
      type T2 = Record<T1, string>;
    `;

    expect(resolved).toMatchInlineSnapshot(`
      "type T1 = 'foo' | 'bar' | 'baz';
      type T2 = { foo: string; bar: string; baz: string };
      "
    `);
  });

  it('can resolve some functions', () => {
    const resolved = resolveTypes`
      type T1 = typeof global.setTimeout;
      type T2 = typeof global.escape;
      type T3 = typeof global.Promise;
      type T4 = typeof Array.prototype.filter;
    `;

    expect(resolved).toMatchInlineSnapshot(`
      "type T1 = (
        callback: (...args: any[]) => void,
        ms: number,
        ...args: any[]
      ) => NodeJS.Timeout;
      type T2 = (str: string) => string;
      type T3 = PromiseConstructor;
      type T4 = {
        <S extends any>(
          callbackfn: (value: any, index: number, array: any[]) => value is S,
          thisArg?: any,
        ): S[];
        (
          callbackfn: (value: any, index: number, array: any[]) => unknown,
          thisArg?: any,
        ): any[];
      };
      "
    `);
  });
});

//      type T3 = typeof global.setTimeout;
