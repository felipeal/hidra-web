import "./utils/jsdomSetup";

import "./utils/CustomExtends";
import { FileError, FileErrorCode } from "../core/FileError";
import { Machine } from "../core/Machine";
import { Ahmes } from "../core/machines/Ahmes";
import { Cesar } from "../core/machines/Cesar";
import { Neander } from "../core/machines/Neander";
import { Ramses } from "../core/machines/Ramses";
import {
  buildMachineBasedOnFileName, buildMachineBasedOnIdentifier, exportMemory, generateFileNameForMachine, importMemory
} from "../ui/utils/MachineFileUtils";
import { buildMachine, getMachineNames } from "../ui/utils/MachineUtils";
import { mockBinaryFile } from "./utils/MockFile";

function valueToUint8(value: number | string): number {
  return (typeof value === "string") ? value.charCodeAt(0) : value;
}

function valuesToBytes(firstValues: Array<number | string>, size?: number) {
  const firstBytes = firstValues.map(valueToUint8);
  const padding = size ? new Array(size - firstBytes.length).fill(0) : [];
  return [...firstBytes, ...padding];
}

async function importMemoryBytes(firstValues: Array<number | string>, size?: number): Promise<Machine> {
  const fileBuffer = new Uint8Array(valuesToBytes(firstValues, size));
  return importMemory(mockBinaryFile("file.mem", fileBuffer));
}

async function expectFileErrorCode(testFunction: () => Promise<unknown>, errorCode: FileErrorCode) {
  try {
    await testFunction();
  } catch (error) {
    expect(error).toBeInstanceOf(FileError);
    expect((error as FileError).errorCode).toBe(errorCode);
  }
}

describe("Machine File Utils", () => {

  test("generateFileNameForMachine: should have correct format/extension for source files", () => {
    const fileNameRegEx = /^Neander_\d\d\d\d-\d\d-\d\d_\d\d-\d\d-\d\d\.ned/;
    expect(generateFileNameForMachine(new Neander(), { isBinary: false })).toMatch(fileNameRegEx);
  });

  test("generateFileNameForMachine: should have correct format/extension for binary files", () => {
    const fileNameRegEx = /^Neander_\d\d\d\d-\d\d-\d\d_\d\d-\d\d-\d\d\.mem/;
    expect(generateFileNameForMachine(new Neander(), { isBinary: true })).toMatch(fileNameRegEx);
  });

  test("buildMachineBasedOnFileName: should map extensions correctly", () => {
    expect(buildMachineBasedOnFileName("test.ned")).toBeInstanceOf(Neander);
    expect(buildMachineBasedOnFileName("test.ahd")).toBeInstanceOf(Ahmes);
    expect(buildMachineBasedOnFileName("test.rad")).toBeInstanceOf(Ramses);
    expect(buildMachineBasedOnFileName("test.ced")).toBeInstanceOf(Cesar);
  });

  test("buildMachineBasedOnFileName: should correctly extract extension", () => {
    expect(buildMachineBasedOnFileName("test.CeD")).toBeInstanceOf(Cesar); // Case insensitive
    expect(buildMachineBasedOnFileName("test.1.ced")).toBeInstanceOf(Cesar); // Multiple dots
    expect(buildMachineBasedOnFileName("test.ned.ced")).toBeInstanceOf(Cesar); // Multiple extensions
    expect(buildMachineBasedOnFileName("test.ned2", "Ramses")).toBeInstanceOf(Ramses); // Invalid extension
    expect(buildMachineBasedOnFileName("ced", "Ramses")).toBeInstanceOf(Ramses); // Not an extension
  });

  test("buildMachineBasedOnFileName: should use fallback for unknown extensions", () => {
    expect(buildMachineBasedOnFileName("test.ced", "Neander")).toBeInstanceOf(Cesar); // Known
    expect(buildMachineBasedOnFileName("test.xyz", "Neander")).toBeInstanceOf(Neander); // Unknown
  });

  test("buildMachineBasedOnIdentifier: should return correct machine", () => {
    for (const machineName of getMachineNames()) {
      const machine = buildMachine(machineName);
      expect(buildMachineBasedOnIdentifier(machine.getIdentifier())?.getName()).toBe(machineName);
    }
  });

  test("importMemory: should reject empty files", async () => {
    await expectFileErrorCode(async () => importMemoryBytes([]), FileErrorCode.EMPTY_BINARY_FILE);
  });

  test("importMemory: should reject files with incorrect/incomplete identifiers", async () => {
    await expectFileErrorCode(async () => importMemoryBytes([3]), FileErrorCode.INVALID_BINARY_FILE);
    await expectFileErrorCode(async () => importMemoryBytes([3, "N"]), FileErrorCode.INVALID_BINARY_FILE);
    await expectFileErrorCode(() => importMemoryBytes([3, "N", "D"]), FileErrorCode.INVALID_BINARY_FILE);
    await expectFileErrorCode(async () => importMemoryBytes([2, "N", "D", "R"]), FileErrorCode.INVALID_BINARY_FILE);
  });

  test("importMemory: should reject files with an unrecognized identifier", async () => {
    await expectFileErrorCode(async () => importMemoryBytes([3, "A", "B", "C"]), FileErrorCode.UNKNOWN_IDENTIFIER);
  });

  test("importMemory: should reject files with invalid size", async () => {
    await expectFileErrorCode(async () => importMemoryBytes([3, "N", "D", "R"], 515), FileErrorCode.INVALID_BINARY_SIZE);
    await expectFileErrorCode(async () => importMemoryBytes([3, "N", "D", "R"], 517), FileErrorCode.INVALID_BINARY_SIZE);
  });

  test("importMemory: should accept valid files", async () => {
    expect(await importMemoryBytes([3, "N", "D", "R"], 516)).toBeInstanceOf(Neander);
    expect(await importMemoryBytes([3, "A", "H", "M"], 516)).toBeInstanceOf(Ahmes);

    const ramses = await importMemoryBytes([3, "R", "M", "S", 16, 0, 32, 0], 516);
    expect(ramses).toBeInstanceOf(Ramses);
    expect(ramses.getMemoryValue(0)).toBe(16);
    expect(ramses.getMemoryValue(1)).toBe(32);
  });

  test("exportMemory: should match expected format", () => {
    const neander = new Neander();
    neander.setMemoryValue(0, 16);
    neander.setMemoryValue(1, 32);
    expect(Array.from(exportMemory(neander))).toEqual(valuesToBytes([3, "N", "D", "R", 16, 0, 32, 0], 516));
  });

});
