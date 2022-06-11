import { } from "./jsdomSetup";

import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeMirror from "codemirror";

const COLUMN_INDEXES = {
  PC_SP: 0,
  ADDRESS: 1
};

export function getPCArrowAddress() {
  const addressCell = within(screen.getByTestId("instructions-table")).getByText("→").nextSibling;
  return addressCell!.textContent;
}

export function getInputByLabel(label: string): HTMLInputElement {
  return screen.getByLabelText(label);
}

export function selectMachine(machineName: string): void {
  userEvent.selectOptions(screen.getByText("Neander").parentElement!, machineName);
  runPendingTimers();
}

export function getSelectedMachine(): string {
  const machineSelect = screen.getByTestId<HTMLSelectElement>("machine-select");
  return machineSelect.options[machineSelect.selectedIndex].text;
}

export function setSourceCode(lines: string | string[]): void {
  codeMirrorInstance.setValue(Array.isArray(lines) ? lines.join("\n") : lines);
}

export function buildSource(lines: string | string[], { steps }: { steps: number } = { steps: 0 }) {
  setSourceCode(lines);
  userEvent.click(screen.getByTestId("build-button"));
  while (steps--) {
    userEvent.click(screen.getByTestId("step-button"));
  }
}

export function changePCRow(address: number): void {
  changePCSPRow(address, "instructions-table");
}

export function changeSPRow(address: number): void {
  changePCSPRow(address, "stack-table");
}

function changePCSPRow(address: number, tableTestId: string) {
  const pcArrowCell = within(screen.getByTestId(tableTestId)).getByText<HTMLTableCellElement>("→");

  const table = pcArrowCell.parentElement!.parentElement as HTMLElement;
  const tableRows = Array.from(table.childNodes);
  const rowToBeClicked = tableRows.find(row => row.childNodes[COLUMN_INDEXES.ADDRESS].textContent === String(address))!;
  const cellToBeClicked = rowToBeClicked.childNodes[COLUMN_INDEXES.PC_SP] as HTMLElement;

  userEvent.click(cellToBeClicked);
}

export function clickLineNumber(lineNumber: number) {
  CodeMirror.signal(window.codeMirrorInstance, "gutterClick", window.codeMirrorInstance, lineNumber - 1);
}

export function runPendingTimers() {
  act(() => {
    jest.runOnlyPendingTimers();
  });
}
