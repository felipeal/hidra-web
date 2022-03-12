import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";
import { Conversion } from "../core/Conversion";

export class Reg extends Machine {

  constructor() {
    super();
    this.identifier = "REG";

    //////////////////////////////////////////////////
    // Initialize registers
    //////////////////////////////////////////////////

    for (let registerId = 0; registerId < 64; registerId++) {
      const bitPattern = ".." + Conversion.valueToString(registerId).substring(2); // "..000000" to "..111111"
      this.registers.push(new Register("R" + String(registerId), bitPattern, 8));
    }

    this.registers.push(new Register("PC", "", 8, false));
    this.PC = this.registers[this.registers.length - 1];

    //////////////////////////////////////////////////
    // Initialize memory
    //////////////////////////////////////////////////

    this.setMemorySize(256);

    //////////////////////////////////////////////////
    // Initialize instructions
    //////////////////////////////////////////////////

    this.instructions.push(new Instruction(1, "00......", InstructionCode.INC,    "inc r"));
    this.instructions.push(new Instruction(1, "01......", InstructionCode.DEC,    "dec r"));
    this.instructions.push(new Instruction(3, "10......", InstructionCode.REG_IF, "if r a0 a1"));
    this.instructions.push(new Instruction(1, "11......", InstructionCode.HLT,    "hlt"));

    //////////////////////////////////////////////////
    // Initialize addressing modes
    //////////////////////////////////////////////////

    this.addressingModes.push(new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN)); // Used for "if r a0 a1"
  }

  public generateArgumentsString(address: number, instruction: Instruction, _addressingModeCode: AddressingModeCode): { argument: string, argumentsSize: number} {
    const argument = String(this.getMemoryValue(address + 1)) + " " + String(this.getMemoryValue(address + 2)); // If instruction's arguments
    const argumentsSize = instruction.getNumBytes() - 1;

    return { argument, argumentsSize };
  }

}