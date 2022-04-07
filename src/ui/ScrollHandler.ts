import { Assembler } from "../core/Assembler";
import { Machine } from "../core/Machine";

const marginLines = 3;

export function scrollToCurrentPCRow(machine: Machine): void {
  const instructionRows: NodeListOf<Element> = document.querySelectorAll(".instruction-row");
  const pcRow = instructionRows.item(machine.getPCValue()) as HTMLElement;
  if (pcRow) {
    const table = pcRow.parentElement!.parentElement!;
    const header = table.firstChild as HTMLElement;
    const tableContentHeight = table.clientHeight - header.offsetHeight;
    const margin = (pcRow.offsetHeight * marginLines);

    // If bottom pixel of PC row is below the current viewport's margin
    if (pcRow.offsetTop + pcRow.offsetHeight > table.scrollTop + tableContentHeight - margin) {
      table.scrollTo(0, pcRow.offsetTop - header.offsetHeight - tableContentHeight + margin + pcRow.offsetHeight);

    // If top pixel of PC row is above the current viewport's margin
    } else if (pcRow.offsetTop < table.scrollTop + margin) {
      table.scrollTo(0, pcRow.offsetTop - header.offsetHeight - margin);
    }
  }
}

export function scrollToFirstDataRow(): void {
  const firstDataRow: HTMLElement | null = document.querySelector(".first-data-row");
  if (firstDataRow) {
    const table = firstDataRow.parentElement!.parentElement!;
    const header = table.firstChild as HTMLElement;
    table?.scrollTo(0, firstDataRow.offsetTop - header.offsetHeight);
  }
}

export function scrollToLastStackRow(): void {
  const stackTable: HTMLElement | null = document.querySelector(".stack-table");
  stackTable?.scrollTo(0, stackTable.scrollHeight);
}

export function scrollToPCLineAndRow(machine: Machine, assembler: Assembler): void {
  const pcCorrespondingSourceLine = assembler.getPCCorrespondingSourceLine();

  if (pcCorrespondingSourceLine > 0) {
    const lineHeight = (document.querySelector("CodeMirror-line") as HTMLElement)?.offsetHeight || 16;
    codeMirrorInstance.scrollIntoView({ line: pcCorrespondingSourceLine, ch: 0 }, (lineHeight * marginLines));
  }

  scrollToCurrentPCRow(machine);
}
