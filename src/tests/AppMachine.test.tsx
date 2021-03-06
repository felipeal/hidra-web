import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { range } from "../core/utils/FunctionUtils";
import App from "../ui/App";
import {
  buildSource, changePCRow, clickLineNumber, getInputByLabel, getPCArrowAddress, runPendingTimers, selectMachine, setSourceCode
} from "./utils/AppTestFunctions";

describe("App: Machine Area", () => {

  beforeEach(() => {
    render(<App isCesarEnabled={true} />);
    setSourceCode("");
  });

  /****************************************************************************
   * Machine select
   ****************************************************************************/

  test("machine select: should allow changing machines", () => {
    userEvent.selectOptions(screen.getByText("Neander").parentElement!, "Ramses");
    expect(screen.getByText(/inicializando/i)).toBeInTheDocument(); // Busy state
    runPendingTimers();
    expect(screen.getByLabelText("C")).toBeInTheDocument(); // Flag
    expect(screen.getByLabelText("X")).toBeInTheDocument(); // Register
    expect(screen.getByText("SHR r")).toBeInTheDocument(); // Instruction
    expect(screen.getByText("#a")).toBeInTheDocument(); // Addressing mode
  });

  /****************************************************************************
   * Flags/Registers/Information
   ****************************************************************************/

  test("flags / registers / counters: should show the updated value", () => {
    expect(getInputByLabel("N")).not.toBeChecked();
    expect(getInputByLabel("Z")).toBeChecked();

    buildSource(["lda 2", "db 128"], { steps: 1 });

    // Flags
    expect(getInputByLabel("N")).toBeChecked();
    expect(getInputByLabel("Z")).not.toBeChecked();

    // Registers
    expect(getInputByLabel("AC")).toHaveValue("128");
    expect(getInputByLabel("PC")).toHaveValue("2");

    // Counters
    expect(screen.getByText(/Instruções: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Acessos: 3/)).toBeInTheDocument();
  });

  /****************************************************************************
   * Machine buttons
   ****************************************************************************/

  test("reset pc button: should clear PC and SP", () => {
    selectMachine("Volta");
    buildSource("PSH #1", { steps: 1 });

    expect(getPCArrowAddress()).toBe("2");
    expect(getInputByLabel("PC")).toHaveValue("2");
    expect(getInputByLabel("SP")).toHaveValue("1");

    userEvent.click(screen.getByText("Zerar PC"));

    expect(getPCArrowAddress()).toBe("0");
    expect(getInputByLabel("PC")).toHaveValue("0");
    expect(getInputByLabel("SP")).toHaveValue("0");
  });

  test.skip("reset pc button: should be enabled if PC != 0 and counters = 0", () => {
    expect(screen.getByText("Zerar PC")).toBeDisabled();

    changePCRow(1);

    expect(screen.getByLabelText("PC")).toHaveValue("1");
    expect(screen.getByText(/Instruções: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Acessos: 0/)).toBeInTheDocument();

    expect(screen.getByText("Zerar PC")).toBeEnabled();
  });

  test.skip("reset pc button: should be enabled if PC = 0 and counters != 0", () => {
    expect(screen.getByText("Zerar PC")).toBeDisabled();

    userEvent.click(screen.getByText("Passo"));
    changePCRow(0);

    expect(screen.getByLabelText("PC")).toHaveValue("0");
    expect(screen.getByText(/Instruções: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Acessos: 1/)).toBeInTheDocument();

    expect(screen.getByText("Zerar PC")).toBeEnabled();
  });

  test.skip("reset pc button: should be enabled if SP != 0", () => {
    // TODO
  });

  test("step button: should move execution to the next instruction", () => {
    userEvent.click(screen.getByText("Passo"));
    expect(getPCArrowAddress()).toBe("1");
    expect(getInputByLabel("PC")).toHaveValue("1");
  });

  test("step button: should be disabled while running", () => {
    buildSource(["nop", "hlt"]);
    userEvent.click(screen.getByText("Rodar"));
    expect(screen.getByText("Passo")).toBeDisabled();
    runPendingTimers();
  });

  test("run button: should run until halt is reached", () => {
    buildSource(["nop", "nop", "hlt"]);
    userEvent.click(screen.getByText("Rodar"));
    runPendingTimers();
    expect(getPCArrowAddress()).toBe("3");
  });

  test("stop button: should stop the machine", () => {
    userEvent.click(screen.getByText("Rodar"));
    userEvent.click(screen.getByText("Parar"));
    runPendingTimers();
    expect(getPCArrowAddress()).toBe("1");
  });

  test("build button: should build the typed code to memory", () => {
    setSourceCode("add h80");
    userEvent.click(screen.getByText("Montar"));
    expect(screen.getByText("ADD 128")).toBeInTheDocument();
  });

  test("build button: should show errors if source code is invalid", () => {
    setSourceCode(["nopx", "", "", "org 256"]);
    userEvent.click(screen.getByText("Montar"));
    expect(screen.getByText(/linha 1: mnemônico inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/linha 4: endereço inválido/i)).toBeInTheDocument();

    userEvent.click(screen.getByText(/linha 4: endereço inválido/i));
    expect(window.codeMirrorInstance.getCursor().line + 1).toBe(4);
  });

  /****************************************************************************
   * Hints
   ****************************************************************************/

  test("directives / instructions / addressing modes: should show tooltip on hover", () => {
    selectMachine("Ramses");

    // Directive
    userEvent.hover(screen.getByText("ORG"));
    expect(screen.getByText("Origin")).toBeInTheDocument();

    // Instruction
    userEvent.hover(screen.getByText("HLT"));
    expect(screen.getByText("Halt")).toBeInTheDocument();

    // Addressing mode
    userEvent.hover(screen.getByText("#a"));
    expect(screen.getByText("Imediato")).toBeInTheDocument();
  });

  /****************************************************************************
   * Breakpoints
   ****************************************************************************/

  test("breakpoints: should stop execution", () => {
    buildSource(["nop", "nop", "nop", "nop"]);

    clickLineNumber(3);

    userEvent.click(screen.getByText("Rodar"));
    for (const _ of range(10)) {
      runPendingTimers();
    }
    expect(getPCArrowAddress()).toBe("2");
  });

  /****************************************************************************
   * Cesar display
   ****************************************************************************/

  test("display: should show characters", () => {
    selectMachine("Cesar");
    buildSource(["mov #'^', 65500", "mov #'$', 65535"], { steps: 2 });

    // Display
    const display = screen.getByText("Display").parentNode as HTMLFieldSetElement;
    expect(display).toBeInTheDocument();

    // Display chars
    expect(within(display).getByText("^")).toBeInTheDocument();
    expect(within(display).getByText("$")).toBeInTheDocument();
  });

  test("keyboard: should send characters to Cesar", () => {
    selectMachine("Cesar");

    function expectAsciiValue(typedText: string, asciiValue: number) {
      buildSource("mov 65499 4"); // Instruction will copy typed key to visible memory area

      userEvent.click(screen.getByText("Rodar"));
      userEvent.type(screen.getByText("Display"), typedText);
      runPendingTimers();

      userEvent.click(screen.getByText("Zerar PC"));
      userEvent.click(screen.getByText("Passo")); // Call copy instruction

      expect(within(screen.getByTestId("data-table")).getByDisplayValue(String(asciiValue))).toBeInTheDocument();
    }

    expectAsciiValue("a", 97);
    expectAsciiValue("A", 65);
    expectAsciiValue("{Enter}", 13);
    expectAsciiValue("{Backspace}", 8);
  });

});
