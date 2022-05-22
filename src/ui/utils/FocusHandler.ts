import { FocusEvent } from "react";
import { FixedSizeList } from "react-window";
import { Assembler } from "../../core/Assembler";
import { clamp } from "../../core/utils/FunctionUtils";

const MARGIN_LINES = 3;

export function scrollToRow(rowIndex: number, table: FixedSizeList, rowHeight: number): void {
  const viewportHeight = Number(table.props.height);
  const viewportTop = (table.state as { scrollOffset: number; }).scrollOffset;
  const viewportBottom = viewportTop + viewportHeight;

  const clampedRowIndex = clamp(rowIndex, MARGIN_LINES, table.props.itemCount - MARGIN_LINES);

  const targetRowTop = calculateScrollOffset(clampedRowIndex, rowHeight);
  const targetRowBottom = targetRowTop + rowHeight;
  const margin = (rowHeight * MARGIN_LINES);

  // If top pixels of target row are above top margin
  if (targetRowTop < viewportTop + margin) {
    table.scrollTo(targetRowTop - margin);
  }

  // If bottom pixels of target row are below bottom margin
  if (targetRowBottom >= viewportBottom - margin) {
    table.scrollTo(targetRowBottom - viewportHeight + margin);
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

export function isInputElementActive(): boolean {
  const inputTags = ["INPUT", "TEXTAREA"];
  const activeElementTag = document.activeElement?.tagName || "";
  return inputTags.includes(activeElementTag);
}
