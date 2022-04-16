import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { } from "./jsdomSetup";

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

export function changePCRow(rowIndex: number): void {
  const arrowCell = within(screen.getByTestId("instructions-table")).getByText<HTMLTableCellElement>("→");
  const table = arrowCell.parentElement!.parentElement as HTMLTableElement;
  const cellToBeClicked = table.rows[rowIndex].childNodes[arrowCell.cellIndex] as HTMLElement;
  userEvent.click(cellToBeClicked);
}

export function changeSPRow(rowIndex: number): void {
  const arrowCell = within(screen.getByTestId("stack-table")).getByText<HTMLTableCellElement>("→");
  const table = arrowCell.parentElement!.parentElement as HTMLTableElement;
  const cellToBeClicked = table.rows[rowIndex].childNodes[arrowCell.cellIndex] as HTMLElement;
  userEvent.click(cellToBeClicked);
}

export function runPendingTimers() {
  act(() => {
    jest.runOnlyPendingTimers();
  });
}
