import { Machine } from "../core/Machine";
import { Ahmes } from "../machines/Ahmes";
import { Cromag } from "../machines/Cromag";
import { Neander } from "../machines/Neander";
import { Pericles } from "../machines/Pericles";
import { Pitagoras } from "../machines/Pitagoras";
import { Queops } from "../machines/Queops";
import { Ramses } from "../machines/Ramses";
import { Reg } from "../machines/Reg";
import { Volta } from "../machines/Volta";

export function buildMachine(machineName: string): Machine {
  switch (machineName) {
    case "Neander": return new Neander();
    case "Ahmes": return new Ahmes();
    case "Ramses": return new Ramses();
    case "Cromag": return new Cromag();
    case "Queops": return new Queops();
    case "Pitagoras": return new Pitagoras();
    case "Pericles": return new Pericles();
    case "REG": return new Reg();
    case "Volta": return new Volta();
    default: throw new Error(`Invalid machine name: ${machineName}`);
  }
}

export function generateFileNameForMachine(machine: Machine): string {
  const localDate = new Date().toLocaleString("sv"); // Similar to ISO
  const sanitizedLocalDate = localDate.replace(" ", "_").replaceAll(":", "-");
  const fileName = `${machine.getName()}_${sanitizedLocalDate}.${getMachineFileExtension(machine)}`;
  return fileName;
}

function getMachineFileExtension(machine: Machine): string {
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
    default: throw new Error(`No file extension for machine: ${machine.getName()}`);
  }
}

export function getMachineNames(): string[] {
  return ["Neander", "Ahmes", "Ramses", "Cromag", "Queops", "Pitagoras", "Pericles", "REG", "Volta"];
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
  }

  if (fallbackMachineName) {
    return buildMachine(fallbackMachineName);
  } else {
    throw new Error(`No machine found for extension: ${fileExtension}`);
  }
}

export function resetPCAndSP(machine: Machine): void {
  machine.setRunning(false);
  machine.setPCValue(0);
  if (machine.hasRegister("SP")) {
    machine.setRegisterValueByName("SP", 0);
  }
  machine.clearCounters();
}
