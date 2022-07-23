import "./utils/jsdomSetup";

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../ui/App";
import { buildSource, getInputByLabel, runPendingTimers, selectMachine, setSourceCode } from "./utils/AppTestFunctions";

describe("Options", () => {

  beforeEach(() => {
    render(<App/>);
    setSourceCode("");
  });

  afterEach(() => {
    runPendingTimers();
  });

  /****************************************************************************
   * Options -> Display hexadecimal values
   ****************************************************************************/

  test("display hex: should toggle hexadecimal mode", async () => {
    selectMachine("Volta");

    // Click menu entry
    userEvent.click(screen.getByText(/Opções/));
    userEvent.click(screen.getByText(/hex/i));
    userEvent.click(screen.getByText("Hidra")); // Close menu

    // Expect padded addresses
    expect(within(screen.getByTestId("instructions-table")).getByText("01")).toBeInTheDocument();
    expect(within(screen.getByTestId("data-table")).getByText("01")).toBeInTheDocument();
    expect(within(screen.getByTestId("stack-table")).getByText("01")).toBeInTheDocument();

    expect(getInputByLabel("PC")).toHaveValue("00"); // Padded PC
    expect(getInputByLabel("SP")).toHaveValue("00"); // Padded SP

    buildSource(["psh #160"], { steps: 1 });
    expect(screen.getByText("PSH #hA0")).toBeInTheDocument(); // Hex instruction string

    // Instructions: edit as hex
    const instructionField = within(screen.getByTestId("instructions-table")).getByDisplayValue("A0");
    userEvent.type(instructionField, "{selectall}B{enter}");
    expect(within(screen.getByTestId("instructions-table")).getByDisplayValue("0B")).toBeInTheDocument();

    // Data: edit as hex
    const dataField = within(screen.getByTestId("data-table")).getByDisplayValue("0B");
    userEvent.type(dataField, "{selectall}C{enter}");
    expect(within(screen.getByTestId("data-table")).getByDisplayValue("0C")).toBeInTheDocument();

    // Stack: edit as hex
    const stackField = within(screen.getByTestId("stack-table")).getByDisplayValue("A0");
    userEvent.type(stackField, "{selectall}D{enter}");
    expect(within(screen.getByTestId("stack-table")).getByDisplayValue("0D")).toBeInTheDocument();
  });

  /****************************************************************************
   * Options -> Display negative values
   ****************************************************************************/

  test("display negative: should toggle negative values", async () => {
    buildSource(["lda MinusOne", "jmp 128", "MinusOne: DB -1"], { steps: 2 });

    expect(getInputByLabel("AC")).toHaveValue("255"); // Unsigned AC (with toggle off)

    // Click menu entry
    userEvent.click(screen.getByText(/Opções/));
    userEvent.click(screen.getByText(/negativ/i));
    userEvent.click(screen.getByText("Hidra")); // Close menu

    expect(getInputByLabel("AC")).toHaveValue("-1"); // Negative AC
    expect(getInputByLabel("PC")).toHaveValue("128"); // Unsigned PC

    expect(within(screen.getByTestId("instructions-table")).getByDisplayValue("255")).toBeInTheDocument(); // Unsigned instructions
    expect(within(screen.getByTestId("data-table")).getByDisplayValue("-1")).toBeInTheDocument(); // Signed data

    selectMachine("Volta");
    buildSource(["psh #255"], { steps: 1 });

    expect(within(screen.getByTestId("instructions-table")).getByText("PSH #-1")).toBeInTheDocument(); // Signed instruction string
    expect(within(screen.getByTestId("stack-table")).getByDisplayValue("-1")).toBeInTheDocument(); // Signed stack data
  });

  /****************************************************************************
   * Options -> Char column
   ****************************************************************************/

  test("display chars: should display char column", async () => {
    selectMachine("Volta");
    buildSource(["psh #'a'"], { steps: 1 });

    // Click menu entry
    userEvent.click(screen.getByText(/Opções/));
    userEvent.click(screen.getByText(/caract/i));
    userEvent.click(screen.getByText("Hidra")); // Close menu

    expect(within(screen.getByTestId("data-table")).getByText("a")).toBeInTheDocument();
    expect(within(screen.getByTestId("stack-table")).getByText("a")).toBeInTheDocument();
  });

  /****************************************************************************
   * Keyboard
   ****************************************************************************/

  test("options: should toggle with space", async () => {
    // Click menu entry
    userEvent.click(screen.getByText(/Opções/));
    userEvent.click(screen.getByText(/hex/i));
    expect(within(screen.getByTestId("data-table")).getByText("01")).toBeInTheDocument();
    userEvent.keyboard(" ");
    expect(within(screen.getByTestId("data-table")).queryByText("01")).not.toBeInTheDocument();
  });

});
