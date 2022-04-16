import { assert } from "./FunctionUtils";

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
