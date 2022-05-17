// eslint-disable-next-line @typescript-eslint/ban-types
type NullableObject = Object | null | undefined;

export function assert(condition: boolean|NullableObject, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failure: ${message}`);
  }
}

export function assertUnreachable(message: string): never {
  throw new Error(`Assertion failure: ${message}`);
}

export function notNull<T>(value: T): Exclude<T, null | undefined> {
  assert(value !== null, "Unexpected null value.");
  assert(value !== undefined, "Unexpected undefined value.");
  return value!;
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

export function clamp(value: number, min: number, max: number): number {
  return (value < min) ? min : ((value > max) ? max : value);
}

export function range(length: number): number[] {
  return Array.from(Array(length).keys());
}

export function buildArray<T>(length: number, buildFunction: (index: number) => T): T[] {
  return range(length).map(buildFunction);
}

export function removeItem<T>(array: T[], removeIndex: number): T[] {
  return [...array.slice(0, removeIndex), ...array.slice(removeIndex + 1)];
}

export function isOneOf<T>(value: T, list: T[]): boolean {
  return list.includes(value);
}

export function multiline(...lines: string[]): string {
  return lines.join("\n");
}
