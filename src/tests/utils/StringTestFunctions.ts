export function expectDistinctStrings(items: string[]) {
  expect(items).not.toContain("");
  expect(new Set(items).size).toBe(items.length);
}
