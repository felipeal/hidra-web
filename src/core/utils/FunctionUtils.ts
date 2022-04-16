// eslint-disable-next-line @typescript-eslint/ban-types
type NullableObject = Object | null;

export function assert(condition: boolean|NullableObject, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failure: ${message}`);
  }
}

export function rethrowUnless(condition: boolean, error: unknown): asserts condition {
  if (!condition) {
    throw error;
  }
}

function isEven(value: number): boolean {
  return (value % 2) === 0;
}

export function isPowerOfTwo(size: number): boolean {
  while (isEven(size) && size > 1) {
    size /= 2;
  }

  return (size === 1);
}

export function range(length: number): number[] {
  return Object.keys(new Array(length).fill(undefined)).map(index => Number(index));
}

export function buildArray<T>(length: number, buildFunction: (index: number) => T): T[] {
  return range(length).map(buildFunction);
}
