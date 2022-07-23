import { AddressingModeCode } from "../core/AddressingMode";
import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/AssemblerError";
import { FileErrorCode } from "../core/FileError";
import { Neander } from "../core/machines/Neander";
import { Pericles } from "../core/machines/Pericles";
import { Queops } from "../core/machines/Queops";
import { Ramses } from "../core/machines/Ramses";
import { Volta } from "../core/machines/Volta";
import { Texts } from "../core/Texts";
import { buildMachine, getMachineNames } from "../ui/utils/MachineUtils";
import { expectDistinctStrings } from "./utils/StringTestFunctions";

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
    const descriptions = directives.map(d => Texts.getDirectiveDescription(d, new Neander()));

    expectDistinctStrings(descriptions.map(d => d.name));
    expectDistinctStrings(descriptions.map(d => d.description));
    expectDistinctStrings(descriptions.map(d => d.examples));
  });

  test("directives: should have specific descriptions for big and little endian words", () => {
    const wordDirectives = ["dw", "daw", "dab/daw"];
    const bigEndianDescriptions = wordDirectives.map(d => Texts.getDirectiveDescription(d, new Neander()));
    const littleEndianDescriptions = wordDirectives.map(d => Texts.getDirectiveDescription(d, new Pericles()));
    const combinedDescriptions = [...bigEndianDescriptions, ...littleEndianDescriptions];

    expectDistinctStrings(combinedDescriptions.map(d => d.description));
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

  test("assembler error codes: should have distinct descriptions", () => {
    const errorCodes = Object.keys(AssemblerErrorCode) as AssemblerErrorCode[];
    const errorMessages = errorCodes.map(c => Texts["getAssemblerErrorCodeMessage"](c));

    expectDistinctStrings(errorMessages);
  });

  test("file error codes: should have distinct descriptions", () => {
    const errorCodes = Object.keys(FileErrorCode) as FileErrorCode[];
    const errorMessages = errorCodes.map(c => Texts.getFileErrorCodeMessage(c));

    expectDistinctStrings(errorMessages);
  });

  test("not found: should throw error", () => {
    expect(() => Texts.getDirectiveDescription("invalid", new Neander())).toThrow();
    expect(() => Texts.getInstructionDescription("invalid", new Neander())).toThrow();
    expect(() => Texts["getVoltaInstructionDescription"]("invalid")).toThrow();
    expect(() => Texts["getCesarInstructionDescription"]("invalid")).toThrow();
  });

});
