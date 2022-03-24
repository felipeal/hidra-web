import { Assembler } from "../../core/Assembler";
import { AssemblerErrorCode } from "../../core/Errors";
import { Machine } from "../../core/Machine";
import { Texts } from "../../core/Texts";

export function makeFunction_expectBuildSuccess(assembler: Assembler, machine: Machine) {
  return (line: string, expectedMemory: number[]) => {
    expect(assembler.build(line)).toDeepEqual([], line);
    const actualMemory = Object.keys(expectedMemory).map((pos) => machine.getMemoryValue(Number(pos)));
    expect(actualMemory).toDeepEqual(expectedMemory, line);
  };
}

export function makeFunction_expectBuildError(assembler: Assembler) {
  return (line: string, errorCode: AssemblerErrorCode, lineNumber = 1) => {
    expect(assembler.build(line)).toDeepEqual([Texts.buildErrorMessage(lineNumber - 1, errorCode)], line);
  };
}

export function makeFunction_expectRunState(assembler: Assembler, machine: Machine) {
  return (lines: string[], steps: number, state: Record<string, number|boolean>) => {
    const source = lines.join("\n");
    expect(assembler.build(source)).toDeepEqual([], source);

    machine.setRunning(true);
    while (machine.isRunning() && steps--) {
      machine.step();
    }

    for (const [key, expectedValue] of Object.entries(state)) {
      const [prefix, identifier] = key.split("_");
      if (prefix === "r") { // Register
        expect(`${key}: ${machine.getRegisterValueByName(identifier)}`).toDeepEqual(`${key}: ${expectedValue}`, source);
      } else if (prefix === "f") { // Flag
        expect(`${key}: ${machine.getFlagValueByName(identifier)}`).toDeepEqual(`${key}: ${expectedValue}`, source);
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
