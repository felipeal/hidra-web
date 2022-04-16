import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../ui/App";
import { } from "./utils/jsdomSetup";
import { buildSource, changePCRow, changeSPRow, selectMachine, setSourceCode } from "./utils/AppTestFunctions";

describe("App: Memory Areas", () => {

  beforeEach(() => {
    render(<App firstRowsOnly />);
    setSourceCode("");
  });

  /****************************************************************************
   * Instructions memory area
   ****************************************************************************/

  test("instructions table: should allow changing PC by clicking", () => {
    changePCRow(2);
    expect(screen.getByLabelText("PC")).toHaveValue("2");
  });

  test("instructions table: should allow editing values", () => {
    buildSource("add 16");
    const inputField = within(screen.getByTestId("instructions-table")).getByDisplayValue("16");
    userEvent.type(inputField, "{selectall}32{enter}");
    expect(screen.getByText("ADD 32")).toBeInTheDocument();
  });

  test("instructions table: should show instruction strings", () => {
    buildSource("add h80");
    expect(screen.getByText("ADD 128")).toBeInTheDocument();
  });

  /****************************************************************************
   * Data memory area
   ****************************************************************************/

  test("data table: should allow editing values", () => {
    buildSource("add 16");
    const inputField = within(screen.getByTestId("data-table")).getByDisplayValue("16");
    userEvent.type(inputField, "{selectall}32{enter}");
    expect(within(screen.getByTestId("data-table")).getByDisplayValue("32")).toBeInTheDocument();
    expect(screen.getByText("ADD 32")).toBeInTheDocument();
  });

  test("data table: should show labels", () => {
    buildSource("TestLabel: db 10");
    expect(screen.getByText("TestLabel")).toBeInTheDocument();
  });

  /****************************************************************************
   * Stack memory area
   ****************************************************************************/

  test("stack table: should allow changing SP by clicking", () => {
    selectMachine("Volta");
    changeSPRow(61);
    expect(screen.getByLabelText("SP")).toHaveValue("2");
  });

  test("stack table: should allow editing values", () => {
    selectMachine("Volta");
    buildSource("psh #16", { steps: 1 });
    const inputField = within(screen.getByTestId("stack-table")).getByDisplayValue("16");
    userEvent.type(inputField, "{selectall}32{enter}");
    expect(within(screen.getByTestId("stack-table")).getByDisplayValue("32")).toBeInTheDocument();
  });

  test("stack table: should update correctly", () => {
    selectMachine("Volta");
    buildSource("psh #255", { steps: 1 });
    expect(within(screen.getByTestId("stack-table")).getByDisplayValue("255")).toBeInTheDocument();
  });

});
