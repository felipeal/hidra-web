import { FocusEvent } from "react";
import { FixedSizeList } from "react-window";
import { Assembler } from "../../core/Assembler";

const MARGIN_LINES = 3;

export function scrollToCurrentPCRow(pcAddress: number, table: FixedSizeList, rowHeight: number): void {
  const viewportHeight = Number(table.props.height);
  const viewportTop = (table.state as { scrollOffset: number; }).scrollOffset;
  const viewportBottom = viewportTop + viewportHeight;

  const pcRowTop = calculateScrollOffset(pcAddress, rowHeight);
  const pcRowBottom = pcRowTop + rowHeight;
  const margin = (rowHeight * MARGIN_LINES);

  // If top pixels of PC row are above top margin
  if (pcRowTop < viewportTop + margin) {
    table.scrollTo(pcRowTop - margin);
  }

  // If bottom pixels of PC row are below bottom margin
  if (pcRowBottom >= viewportBottom - margin) {
    table.scrollTo(pcRowBottom - viewportHeight + margin);
  }
}

export function scrollToPCSourceLine(assembler: Assembler): void {
  const pcCorrespondingSourceLine = assembler.getPCCorrespondingSourceLine();

  if (pcCorrespondingSourceLine > 0) {
    const lineHeight = codeMirrorInstance.defaultTextHeight();
    codeMirrorInstance.scrollIntoView({ line: pcCorrespondingSourceLine, ch: 0 }, (lineHeight * MARGIN_LINES));
  }
}

export function calculateScrollOffset(address: number, rowHeight: number): number {
  return address * rowHeight + 1;
}

export function focusMemoryInput(currentInput: HTMLInputElement, position: "PREVIOUS" | "NEXT"): void {
  const currentRow = currentInput.parentElement!.parentElement as HTMLDivElement;
  const columnIndex = Array.from(currentRow.childNodes).indexOf(currentInput.parentElement!);
  const rowAtPosition = (position === "PREVIOUS") ? currentRow.previousSibling : currentRow.nextSibling;
  if (rowAtPosition) {
    const inputToFocus = rowAtPosition.childNodes[columnIndex].childNodes[0] as HTMLInputElement;
    inputToFocus.focus();
  }
}

export function onFocusSelectAll(event: FocusEvent<HTMLInputElement>): void {
  setTimeout(() => {
    if (document.activeElement === event.target) {
      event.target.select();
    }
  }, 0);
}
