import { Assembler } from "../../core/Assembler";
import { CesarAssembler } from "../../core/CesarAssembler";
import { Machine } from "../../core/Machine";
import { Ahmes } from "../../core/machines/Ahmes";
import { Cesar } from "../../core/machines/Cesar";
import { Cromag } from "../../core/machines/Cromag";
import { Neander } from "../../core/machines/Neander";
import { Pericles } from "../../core/machines/Pericles";
import { Pitagoras } from "../../core/machines/Pitagoras";
import { Queops } from "../../core/machines/Queops";
import { Ramses } from "../../core/machines/Ramses";
import { Reg } from "../../core/machines/Reg";
import { Volta } from "../../core/machines/Volta";
import { assertUnreachable } from "../../core/utils/FunctionUtils";
import { buildMachine } from "./MachineUtils";

export class FileError extends Error {}

const IDENTIFIER_LENGTH = 3;

export function generateFileNameForMachine(machine: Machine, { isBinary = false } = {}): string {
  const localDate = new Date().toLocaleString("sv"); // 2000-12-31 00:00:00
  const sanitizedLocalDate = localDate.replace(" ", "_").replaceAll(":", "-"); // 2000-12-31_00-00-00
  const extension = isBinary ? "mem" : getMachineFileExtension(machine);
  const fileName = `${machine.getName()}_${sanitizedLocalDate}.${extension}`;
  return fileName;
}

export function getMachineFileExtension(machine: Machine): string {
  switch (machine.getName()) {
    case "Neander": return "ned";
    case "Ahmes": return "ahd";
    case "Ramses": return "rad";
    case "Cromag": return "cro"; // .crd .cmd N/A
    case "Queops": return "qpd";
    case "Pitagoras": return "ptd";
    case "Pericles": return "prd"; // .pid .pit N/A
    case "REG": return "red";
    case "Volta": return "vod";
    case "Cesar": return "ced";
    default: assertUnreachable(`No file extension for machine: ${machine.getName()}`);
  }
}

// TODO: Map machine to extensions only once
export function buildMachineBasedOnFileName(fileName: string, fallbackMachineName?: string): Machine {
  const fileExtension = fileName.replace(/.*\./, "");

  switch (fileExtension) {
    case "ned": return new Neander();
    case "ahd": return new Ahmes();
    case "rad": return new Ramses();
    case "cro": return new Cromag();
    case "qpd": return new Queops();
    case "ptd": return new Pitagoras();
    case "prd": return new Pericles();
    case "red": return new Reg();
    case "vod": return new Volta();
    case "ced": return new Cesar();
  }

  if (fallbackMachineName) {
    return buildMachine(fallbackMachineName);
  } else {
    assertUnreachable(`No machine found for extension: ${fileExtension}`);
  }
}

export function buildMachineBasedOnIdentifier(identifier: string): Machine | null {
  // TODO: Static identifiers?
  switch (identifier) {
    case (new Neander().getIdentifier()): return new Neander();
    case (new Ahmes().getIdentifier()): return new Ahmes();
    case (new Ramses().getIdentifier()): return new Ramses();
    case (new Cromag().getIdentifier()): return new Cromag();
    case (new Queops().getIdentifier()): return new Queops();
    case (new Pitagoras().getIdentifier()): return new Pitagoras();
    case (new Pericles().getIdentifier()): return new Pericles();
    case (new Reg().getIdentifier()): return new Reg();
    case (new Volta().getIdentifier()): return new Volta();
    case (new Cesar().getIdentifier()): return new Cesar();
    default: return null;
  }
}

export function buildAssemblerBasedOnMachine(machine: Machine): Assembler {
  if (machine instanceof Cesar) {
    return new CesarAssembler(machine);
  } else {
    return new Assembler(machine);
  }
}

export async function importMemory(file: File): Promise<Machine> {
  const fileContents = await file.arrayBuffer();
  const bytes = new Uint8Array(fileContents);
  if (bytes.length === 0) {
    throw new FileError("Binary file is empty.");
  }

  const identifier = new TextDecoder().decode(bytes.slice(1, 1 + IDENTIFIER_LENGTH));
  if (bytes[0] !== IDENTIFIER_LENGTH || identifier.length < IDENTIFIER_LENGTH) {
    throw new FileError("Invalid binary file.");
  }

  const newMachine = buildMachineBasedOnIdentifier(identifier);
  if (!newMachine) {
    throw new FileError(`Unknown identifier: ${identifier}`);
  }

  // FIXME: No padding for Cesar
  // TODO: What about Pericles on Hidra C++?
  const memory = bytes.slice(1 + identifier.length).filter((_value, index) => (index % 2) === 0);
  if (bytes.length !== (1 + newMachine.getIdentifier().length) + (newMachine.getMemorySize() * 2)) {
    throw new FileError("Invalid binary size.");
  }

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
    binary.push(byte.getValue(), 0);
  }

  return new Uint8Array(binary);
}
