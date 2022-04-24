export function toPx(value: number | undefined): string | undefined {
  return value ? `${value}px` : undefined;
}

export function classes(...classes: string[]): string | undefined {
  const nonEmptyClasses = classes.filter(c => c).join(" ");
  return (nonEmptyClasses.length > 0) ? nonEmptyClasses : undefined;
}
