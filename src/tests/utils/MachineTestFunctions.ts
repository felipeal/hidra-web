import { Assembler } from "../../core/Assembler";
import { AssemblerErrorCode } from "../../core/Errors";
import { Machine } from "../../core/Machine";
import { Texts } from "../../core/Texts";

export function makeFunction_expectBuildSuccess(assembler: Assembler, machine: Machine) {
  return (lines: string|string[], expectedMemory: number[]) => {
    const source = Array.isArray(lines) ? lines.join("\n") : lines;
    expect(assembler.build(source).map(Texts.buildErrorMessageText)).toDeepEqual([], source);
    const actualMemory = Object.keys(expectedMemory).map((pos) => machine.getMemoryValue(Number(pos)));
    expect(actualMemory).toDeepEqual(expectedMemory, source);

    // Next value should be zero
    if (expectedMemory.length < machine.getMemorySize()) {
      expect(machine.getMemoryValue(expectedMemory.length)).toDeepEqual(0, source);
    }
  };
}

export function makeFunction_expectBuildError(assembler: Assembler) {
  return (lines: string|string[], errorCode: AssemblerErrorCode, lineNumber = 1) => {
    const source = Array.isArray(lines) ? lines.join("\n") : lines;
    expect(assembler.build(source).map(Texts.buildErrorMessageText)).toDeepEqual([{ lineNumber, errorCode }].map(Texts.buildErrorMessageText), source);
  };
}

export function makeFunction_expectRunState(assembler: Assembler, machine: Machine) {
  return (instructionLines: string[], dataLines: string[], state: Record<string, number|boolean>) => {
    const source = instructionLines.join("\n") + "\n\n" + dataLines.join("\n");
    expect(assembler.build(source)).toDeepEqual([], source);

    machine.setRunning(true);
    let remainingInstructions = instructionLines.length;
    while (machine.isRunning() && remainingInstructions--) {
      machine.step();
    }

    for (const [key, expectedValue] of Object.entries(state)) {
      const [prefix, identifier] = key.split("_");
      if (prefix === "r") { // Register
        expect(`${key}: ${machine.getRegisterValue(identifier)}`).toDeepEqual(`${key}: ${expectedValue}`, source);
      } else if (prefix === "f") { // Flag
        expect(`${key}: ${machine.isFlagTrue(identifier)}`).toDeepEqual(`${key}: ${expectedValue}`, source);
      } else if (prefix === "m") { // Memory
        expect(`${key}: ${machine.getMemoryValue(Number(identifier))}`).toDeepEqual(`${key}: ${expectedValue}`, source);
      } else if (key === "isRunning") {
        expect(`${key}: ${machine.isRunning()}`).toDeepEqual(`${key}: ${expectedValue}`, source);
      } else {
        throw new Error("Invalid key on state object: " + key);
      }
    }
  };
}
