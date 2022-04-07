import { AddressingModeCode } from "../core/AddressingMode";
import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/Errors";
import { Texts } from "../core/Texts";
import { Neander } from "../machines/Neander";
import { Pericles } from "../machines/Pericles";
import { Queops } from "../machines/Queops";
import { Ramses } from "../machines/Ramses";
import { Volta } from "../machines/Volta";
import { buildMachine, getMachineNames } from "../ui/MachineUtils";

function expectDistinctStrings(items: string[]) {
  expect(items).not.toContain("");
  expect(new Set(items).size).toBe(items.length);
}

describe("Texts", () => {

  test("instructions: descriptions should be distinct for a given machine", () => {
    for (const machine of getMachineNames().map(buildMachine)) {
      const instructionFormats = machine.getInstructions().map(i => i.getAssemblyFormat());
      const descriptions = instructionFormats.map(f => Texts.getInstructionDescription(f, machine));

      expectDistinctStrings(descriptions.map(d => d[0]));
      expectDistinctStrings(descriptions.map(d => d[1]));
    }
  });

  test("directives: should have distinct descriptions", () => {
    const directives = [...Assembler.DIRECTIVES, "dab/daw"];
    const descriptions = directives.map(d => Texts.getDirectiveDescription(d));

    expectDistinctStrings(descriptions.map(d => d.name));
    expectDistinctStrings(descriptions.map(d => d.description));
    expectDistinctStrings(descriptions.map(d => d.examples));
  });

  test("addressing modes: should have distinct descriptions", () => {
    for (const machine of getMachineNames().map(buildMachine)) {
      const addressingModeCodes = machine.getAddressingModes().map(m => m.getAddressingModeCode());
      const descriptions = addressingModeCodes.map(c => Texts.getAddressingModeDescription(c, new Neander()));

      expectDistinctStrings(descriptions.map(d => d.name));
      expectDistinctStrings(descriptions.map(d => d.description));
      expectDistinctStrings(descriptions.map(d => d.examples));
    }
  });

  test("addressing modes: should use the correct immediate example for each machine", () => {
    expect(Texts.getAddressingModeDescription(AddressingModeCode.IMMEDIATE, new Ramses()).examples).toContain("ADD A #1");
    expect(Texts.getAddressingModeDescription(AddressingModeCode.IMMEDIATE, new Pericles()).examples).toContain("ADD A #1");
    expect(Texts.getAddressingModeDescription(AddressingModeCode.IMMEDIATE, new Queops()).examples).toContain("ADD #1");
    expect(Texts.getAddressingModeDescription(AddressingModeCode.IMMEDIATE, new Volta()).examples).toContain("PSH #1");
  });

  test("error codes: should have distinct descriptions", () => {
    const errorCodes = Object.keys(AssemblerErrorCode) as AssemblerErrorCode[];
    const errorMessages = errorCodes.map(c => Texts["getErrorCodeMessage"](c));

    expectDistinctStrings(errorMessages);
  });

});
