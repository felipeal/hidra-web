export function toPx(value: number | undefined): string | undefined {
  return value ? `${value}px` : undefined;
}

export function classes(...classes: string[]): string | undefined {
  const nonEmptyClasses = classes.filter(c => c).join(" ");
  return (nonEmptyClasses.length > 0) ? nonEmptyClasses : undefined;
}

export type TableDimensions = { rowWidth: number; headerHeight: number; rowHeight: number; columnWidths: number[]; };

export function calculateTableDimensions(headerElement: HTMLDivElement, bodyElement: HTMLDivElement): TableDimensions {
  const headerCells = Array.from(headerElement.childNodes) as Array<HTMLTableCellElement>;
  return {
    rowWidth: headerElement.offsetWidth,
    headerHeight: headerElement.offsetHeight,
    rowHeight: bodyElement.offsetHeight,
    columnWidths: headerCells.map(cell => cell.offsetWidth)
  };
}
