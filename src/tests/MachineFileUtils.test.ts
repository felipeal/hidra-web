import { } from "./utils/jsdomSetup";

import { } from "./utils/CustomExtends";
import { Neander } from "../core/machines/Neander";
import { buildMachineBasedOnIdentifier, exportMemory, FileError, generateFileNameForMachine, getMachineFileExtension, importMemory }
  from "../ui/utils/MachineFileUtils";
import { buildMachine, getMachineNames } from "../ui/utils/MachineUtils";
import { expectDistinctStrings } from "./utils/StringTestFunctions";
import { Machine } from "../core/Machine";
import { Ahmes } from "../core/machines/Ahmes";
import { Ramses } from "../core/machines/Ramses";

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
  File.prototype.arrayBuffer = jest.fn().mockResolvedValueOnce(fileBuffer);
  return importMemory(new File([fileBuffer], "file.mem"));
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

  test("getMachineFileExtension: should have distinct extensions for each machines", () => {
    const extensions = getMachineNames().map((name) => getMachineFileExtension(buildMachine(name)));
    expectDistinctStrings(extensions);
  });

  test.skip("buildMachineBasedOnFileName", () => {
    // TODO: Test multiple dots, e.g. "FILE.NAME.ned"
  });

  test("buildMachineBasedOnIdentifier: should return correct machine", () => {
    for (const machineName of getMachineNames()) {
      const machine = buildMachine(machineName);
      expect(buildMachineBasedOnIdentifier(machine.getIdentifier())?.getName()).toBe(machineName);
    }
  });

  test("importMemory: should reject empty files", async () => {
    await expect(async () => importMemoryBytes([])).rejects.toThrowError(FileError);
  });

  test("importMemory: should reject files with incorrect/incomplete identifiers", async () => {
    await expect(async () => importMemoryBytes([3])).rejects.toThrowError(FileError);
    await expect(async () => importMemoryBytes([3, "N"])).rejects.toThrowError(FileError);
    await expect(async () => importMemoryBytes([3, "N", "D"])).rejects.toThrowError(FileError);
    await expect(async () => importMemoryBytes([2, "N", "D", "R"])).rejects.toThrowError(FileError);
  });

  test("importMemory: should reject files with an unrecognized identifier", async () => {
    await expect(async () => importMemoryBytes([3, "A", "B", "C"])).rejects.toThrowError(FileError);
  });

  test("importMemory: should reject files with invalid size", async () => {
    await expect(async () => importMemoryBytes([3, "N", "D", "R"], 515)).rejects.toThrowError(FileError);
    await expect(async () => importMemoryBytes([3, "N", "D", "R"], 517)).rejects.toThrowError(FileError);
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
