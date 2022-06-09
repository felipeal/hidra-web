import fs from "fs";
import { Machine } from "../core/Machine";
import { notNull } from "../core/utils/FunctionUtils";

import { buildAssemblerBasedOnMachine, buildMachineBasedOnFileName, hasZeroPaddedExports, removeZeroPadding } from "../ui/utils/MachineFileUtils";

const resourcesPath = "src/tests/resources";

function readBinaryFile(filePath: string) {
  return fs.readFileSync(`${resourcesPath}/${filePath}`);
}

function readTextFile(filePath: string) {
  return fs.readFileSync(`${resourcesPath}/${filePath}`, "utf-8");
}

function readMachineBinary(filePath: string, machine: Machine) {
  const binary = readBinaryFile(filePath);
  const identifier = binary.slice(1, 1 + binary[0]).toString();
  let memoryArea = Array.from(binary.slice(1 + identifier.length));
  if (hasZeroPaddedExports(machine)) {
    memoryArea = removeZeroPadding(memoryArea);
  }
  expect(memoryArea.length).toBeGreaterThanOrEqual(256);
  return [memoryArea, identifier];
}

type MemoryComparison = { buildOnly?: boolean, instructions?: number; accesses?: number; extraAccesses?: number; }

describe("Memory Comparisons", () => {

  // extraAccesses: Jumps that are not executed do not need to read the
  // argument byte, and so these accesses should not be counted, but they are
  // counted in the original WNeander.exe and WAhmes.exe. Interestingly,
  // WRamses.exe does not count these extra accesses.

  test.each([
    ["neander_instructions.ned", { instructions: 39, accesses: 106, extraAccesses: 2 }],
    ["ahmes_instructions_1.ahd", { instructions: 56, accesses: 153, extraAccesses: 4 }],
    ["ahmes_instructions_2.ahd", { instructions: 67, accesses: 163, extraAccesses: 8 }],
    ["ramses_instructions.rad", { instructions: 80, accesses: 176 }],
    ["assembler.rad", { buildOnly: true }],
    ["cesar_assembler.ced", { buildOnly: true }],
    ["cesar_instructions.ced", { instructions: 59, accesses: 338 }]
  ])("%s: should match Daedalus and original simulators' output", (fileName, { instructions, accesses, extraAccesses, buildOnly }: MemoryComparison) => {
    // Build
    const machine = buildMachineBasedOnFileName(fileName);
    const assembler = buildAssemblerBasedOnMachine(machine);
    const sourceCode = readTextFile(`${fileName}`);
    const buildErrors = assembler.build(sourceCode);

    // Test build results
    const [expectedMemoryBeforeRunning, expectedIdentifier] = readMachineBinary(fileName.replace(/\..*/, ".build.mem"), machine);
    expect(machine.getIdentifier()).toStrictEqual(expectedIdentifier);
    expect(buildErrors).toStrictEqual([]);
    expect(assembler.getBuildSuccessful()).toBe(true);
    for (let i = 0; i < expectedMemoryBeforeRunning.length; i++) {
      expect(`MEM[${i}] = ${machine.getMemoryValue(i)}`).toBe(`MEM[${i}] = ${expectedMemoryBeforeRunning[i]}`);
    }

    if (buildOnly) {
      return;
    }

    // Execute
    machine.setRunning(true);
    while (machine.isRunning()) {
      machine.step();
    }

    // Test execute results
    const [expectedMemoryAfterRunning] = readMachineBinary(fileName.replace(/\..*/, ".run.mem"), machine);
    for (let i = 0; i < expectedMemoryAfterRunning.length; i++) {
      expect(`MEM[${i}] = ${machine.getMemoryValue(i)}`).toBe(`MEM[${i}] = ${expectedMemoryAfterRunning[i]}`);
    }
    expect(machine.getInstructionCount()).toBe(notNull(instructions));
    expect(machine.getAccessCount()).toBe(notNull(accesses) - (extraAccesses ?? 0));
  });

});
