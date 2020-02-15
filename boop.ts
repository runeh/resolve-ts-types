import { URL } from 'url';
import { identity } from './bab';

export class Yay {}

function testolini<X>(thing: X) {
  if (typeof thing === 'string') {
    return thing;
  } else {
    return undefined;
  }
}

async function zup(name: string) {
  return () => identity(new URL(name));
}

type lol = typeof testolini;
type lal = typeof zup;
