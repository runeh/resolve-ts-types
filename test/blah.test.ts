import { typeGetter } from '../src/index';
import dedent from 'dedent';

describe('type getter', () => {
  const resolveTypes = typeGetter(__filename);

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
      type T2 = Record<string, { name: string; age: number }>;
      type T3 = keyof T1;
      type T4 = {[K in T1]: string };
      type T4 = Record<T1, string>;
    `;

    expect(resolved).toMatchInlineSnapshot(`
      "type T1 = 'foo' | 'bar' | 'baz';
      type T2 = { [x: string]: { name: string; age: number } };
      type T3 = string | number | symbol;
      type T4 = { [x: string]: string };
      "
    `);
  });
});

//      type T3 = typeof global.setTimeout;
