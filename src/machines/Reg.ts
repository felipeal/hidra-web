import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";
import { buildArray } from "../core/FunctionUtils";
import { unsignedByteToBitPattern } from "../core/Conversions";

export class Reg extends Machine {

  constructor() {
    super({
      name: "REG",
      identifier: "REG",
      memorySize: 256,
      flags: [
      ],
      registers: [
        ...buildArray(64, (registerId) => {
          const bitPattern = ".." + unsignedByteToBitPattern(registerId).substring(2); // "..000000" to "..111111"
          return new Register("R" + String(registerId), bitPattern, 8);
        }),
        new Register("PC", "", 8, false)
      ],
      instructions: [
        new Instruction(1, "00......", InstructionCode.REG_INC, "inc r"),
        new Instruction(1, "01......", InstructionCode.REG_DEC, "dec r"),
        new Instruction(3, "10......", InstructionCode.REG_IF, "if r a0 a1"),
        new Instruction(1, "11......", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN) // Used for "if r a0 a1"
      ]
    });
  }

  public executeInstruction(instruction: Instruction | null, addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number): void {
    const instructionCode = (instruction) ? instruction.getInstructionCode() : InstructionCode.NOP;

    switch (instructionCode) {
      case InstructionCode.REG_INC:
        this.setRegisterValue(registerName, this.getRegisterValue(registerName) + 1);
        break;

      case InstructionCode.REG_DEC:
        this.setRegisterValue(registerName, this.getRegisterValue(registerName) - 1);
        break;

      case InstructionCode.REG_IF:
        if (this.getRegisterValue(registerName) === 0) {
          this.setPCValue(this.getMemoryValue(immediateAddress));
        } else {
          this.setPCValue(this.getMemoryValue(immediateAddress + 1));
        }
        break;

      case InstructionCode.HLT:
        this.setRunning(false);
        break;
    }

    this.incrementInstructionCount();
  }

  public generateArgumentsString(
    address: number, instruction: Instruction, _addressingModeCode: AddressingModeCode
  ): { argument: string, argumentsSize: number } {
    const argument = String(this.getMemoryValue(address + 1)) + " " + String(this.getMemoryValue(address + 2)); // IF instruction's arguments
    const argumentsSize = instruction.getNumBytes() - 1;

    return { argument, argumentsSize };
  }

}
