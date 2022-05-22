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
    case "Cesar": return new Cesar();
    default: assertUnreachable(`Invalid machine name: ${machineName}`);
  }
}

export function getMachineNames(): string[] {
  return ["Neander", "Ahmes", "Ramses", "Cromag", "Queops", "Pitagoras", "Pericles", "REG", "Volta", "Cesar"];
}

export function resetPCAndSP(machine: Machine): void {
  machine.setRunning(false);
  machine.setPCValue(0);
  if (machine.hasRegister("SP")) {
    machine.setRegisterValue("SP", 0);
  }
  machine.clearCounters();
}
