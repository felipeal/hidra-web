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

export function getMachineNames(): string[] {
  return ["Neander", "Ahmes", "Ramses", "Cromag", "Queops", "Pitagoras", "Pericles", "REG", "Volta"];
}

export function resetPCAndSP(machine: Machine): void {
  machine.setRunning(false);
  machine.setPCValue(0);
  if (machine.hasRegister("SP")) {
    machine.setRegisterValueByName("SP", 0);
  }
  machine.clearCounters();
}
