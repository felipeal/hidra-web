import fs from "fs";

import { Assembler } from "../core/Assembler";
import { buildMachineBasedOnFileName } from "../ui/MachineFileUtils";

const resourcesPath = "src/tests/resources";

function readBinaryFile(filePath: string) {
  return fs.readFileSync(`${resourcesPath}/${filePath}`);
}

function readTextFile(filePath: string) {
  return fs.readFileSync(`${resourcesPath}/${filePath}`, "utf-8");
}

function readMachineBinary(filePath: string) {
  const binary = readBinaryFile(filePath);
  const identifier = binary.slice(1, 1 + binary[0]).toString();
  const memory = binary.slice(1 + identifier.length).filter((_value, index) => (index % 2) === 0);
  return [memory, identifier];
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
    ["ramses_instructions.rad", { instructions: 80, accesses: 176, extraAccesses: 0 }],
    ["assembler.rad", { buildOnly: true }]
  ])("%s: should match Daedalus and original simulators' output", (fileName, { instructions, accesses, extraAccesses, buildOnly }: MemoryComparison) => {
    // Build
    const machine = buildMachineBasedOnFileName(fileName);
    const assembler = new Assembler(machine);
    const sourceCode = readTextFile(`${fileName}`);
    const errorMessages = assembler.build(sourceCode);

    // Test build
    const [expectedMemoryBeforeRunning, expectedIdentifier] = readMachineBinary(fileName.replace(/\..*/, ".build.mem"));
    expect(machine.getIdentifier()).toStrictEqual(expectedIdentifier);
    expect(errorMessages).toStrictEqual([]);
    expect(assembler.getBuildSuccessful()).toBe(true);
    for (let i = 0; i < 256; i++) {
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

    // Test execute
    const [expectedMemoryAfterRunning] = readMachineBinary(fileName.replace(/\..*/, ".run.mem"));
    for (let i = 0; i < 256; i++) {
      expect(`MEM[${i}] = ${machine.getMemoryValue(i)}`).toBe(`MEM[${i}] = ${expectedMemoryAfterRunning[i]}`);
    }
    expect(machine.getInstructionCount()).toBe(instructions);
    expect(machine.getAccessCount()).toBe(accesses! - extraAccesses!);
  });

});
