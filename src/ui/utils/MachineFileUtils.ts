import { Assembler } from "../../core/Assembler";
import { CesarAssembler } from "../../core/CesarAssembler";
import { FileError, FileErrorCode } from "../../core/FileError";
import { Machine } from "../../core/Machine";
import { Cesar } from "../../core/machines/Cesar";
import { assert } from "../../core/utils/FunctionUtils";
import { buildMachine, getMachineNames } from "./MachineUtils";

const IDENTIFIER_LENGTH = 3;

export function generateFileNameForMachine(machine: Machine, { isBinary = false } = {}): string {
  const localDate = new Date().toLocaleString("sv"); // 2000-12-31 00:00:00
  const sanitizedLocalDate = localDate.replace(" ", "_").replaceAll(":", "-"); // 2000-12-31_00-00-00
  const extension = isBinary ? "mem" : machine.getFileExtension();
  const fileName = `${machine.getName()}_${sanitizedLocalDate}.${extension}`;
  return fileName;
}

export function buildMachineBasedOnFileName(fileName: string, fallbackMachineName?: string): Machine {
  const fileExtension = fileName.split(".").slice(1).pop() ?? "";

  for (const machineName of getMachineNames()) {
    const machine = buildMachine(machineName);
    if (machine.getFileExtension() === fileExtension.toLowerCase()) {
      return machine;
    }
  }

  assert(fallbackMachineName, `No fallback provided and no machine found for extension: ${fileExtension}`);
  return buildMachine(fallbackMachineName);
}

export function buildMachineBasedOnIdentifier(identifier: string): Machine | null {
  for (const machineName of getMachineNames()) {
    const machine = buildMachine(machineName);
    if (machine.getIdentifier() === identifier) {
      return machine;
    }
  }

  return null;
}

export function buildAssemblerBasedOnMachine(machine: Machine): Assembler {
  if (Cesar.isCesar(machine)) {
    return new CesarAssembler(machine);
  } else {
    return new Assembler(machine);
  }
}

export async function importMemory(file: File): Promise<Machine> {
  const fileContents = await file.arrayBuffer();
  const bytes = new Uint8Array(fileContents);
  if (bytes.length === 0) {
    throw new FileError(FileErrorCode.EMPTY_BINARY_FILE);
  }

  const identifier = new TextDecoder().decode(bytes.slice(1, 1 + IDENTIFIER_LENGTH));
  if (bytes[0] !== IDENTIFIER_LENGTH || identifier.length < IDENTIFIER_LENGTH) {
    throw new FileError(FileErrorCode.INVALID_BINARY_FILE);
  }

  const newMachine = buildMachineBasedOnIdentifier(identifier);
  if (!newMachine) {
    throw new FileError(FileErrorCode.UNKNOWN_IDENTIFIER);
  }

  const memoryArea = Array.from(bytes.slice(1 + identifier.length));
  const expectedMemoryAreaLength = hasZeroPaddedExports(newMachine) ? (newMachine.getMemorySize() * 2) : newMachine.getMemorySize();

  if (memoryArea.length !== expectedMemoryAreaLength) {
    throw new FileError(FileErrorCode.INVALID_BINARY_SIZE);
  }

  const memory = hasZeroPaddedExports(newMachine) ? removeZeroPadding(memoryArea) : memoryArea;
  newMachine.setMemoryValues(Array.from(memory));
  newMachine.updateInstructionStrings();
  return newMachine;
}

export function exportMemory(machine: Machine): Uint8Array {
  const binary = [
    machine.getIdentifier().length,
    ...Array.from(new TextEncoder().encode(machine.getIdentifier()))
  ];

  for (const byte of machine.getMemory()) {
    binary.push(byte.getValue());
    if (hasZeroPaddedExports(machine)) {
      binary.push(0);
    }
  }

  return new Uint8Array(binary);
}

// Machines with 256 bytes import/export memory using 512 bytes (extra bytes are zero)
export function hasZeroPaddedExports(machine: Machine): boolean {
  return machine.getMemorySize() === 256;
}

export function removeZeroPadding(bytes: number[]): number[] {
  return bytes.filter((_value, index) => (index % 2) === 0);
}
