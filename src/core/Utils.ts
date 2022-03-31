export type EventCallback = ((value: unknown) => void);

export type UnsubscribeCallback = () => void;

export function buildUnsubscribeCallback(callbacks: UnsubscribeCallback[]): UnsubscribeCallback {
  return () => callbacks.forEach(callback => callback());
}

// eslint-disable-next-line @typescript-eslint/ban-types
type NullableObject = Object | null;

export function assert(condition: boolean|NullableObject, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failure: ${message}`);
  }
}

export class RegExpMatcher extends RegExp {

  private lastMatch: RegExpMatchArray | null = null;

  fullMatch(str: string): boolean {
    this.lastMatch = str.match(this);
    return Boolean(str === this.lastMatch?.[0]);
  }

  match(str: string): boolean {
    this.lastMatch = str.match(this);
    return Boolean(this.lastMatch);
  }

  // Returns capture "index" from the last fullMatch/match call (0 = full string)
  cap(index: number): string {
    assert(this.lastMatch, "Capture accessed without lastMatch.");
    assert(this.lastMatch[index] !== undefined, `No match for group ${index}.`);
    return this.lastMatch[index];
  }

}

export function validateSize(size: number): void {
  while (((size % 2) === 0) && size > 1) { // While value is even and greater than one
    size /= 2;
  }

  assert((size === 1), `Memory/stack size must be a power of two: ${size}`);
}

export function range(length: number): number[] {
  return Object.keys(new Array(length).fill(undefined)).map(index => Number(index));
}

export function buildArray<T>(length: number, buildFunction: (index: number) => T): T[] {
  return range(length).map(buildFunction);
}
