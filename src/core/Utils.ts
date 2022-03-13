export function Q_ASSERT(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failure: ${message}`);
  }
}

export class QRegExp extends RegExp {

  private lastMatch: RegExpMatchArray|null = null;

  exactMatch(str: string): boolean {
    this.lastMatch = str.match(this);
    return Boolean(str === this.lastMatch?.[0]);
  }

  cap(index: number): string {
    Q_ASSERT(!!this.lastMatch, "Capture accessed without lastMatch.");
    return this.lastMatch[index];
  }

}
