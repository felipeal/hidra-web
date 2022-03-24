import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Pericles extends Machine {

  constructor() {
    super({
      name: "Pericles",
      identifier: "PRC",
      memorySize: 4096,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO, "Z", true),
        new Flag(FlagCode.CARRY, "C")
      ],
      registers: [
        new Register("A", "....00..", 8),
        new Register("B", "....01..", 8),
        new Register("X", "....10..", 8),
        new Register("PC", "", 12, false)
      ],
      instructions: [
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),
        new Instruction(0, "0001....", InstructionCode.STR, "str r a"),
        new Instruction(0, "0010....", InstructionCode.LDR, "ldr r a"),
        new Instruction(0, "0011....", InstructionCode.ADD, "add r a"),
        new Instruction(0, "0100....", InstructionCode.OR, "or r a"),
        new Instruction(0, "0101....", InstructionCode.AND, "and r a"),
        new Instruction(1, "0110....", InstructionCode.NOT, "not r"),
        new Instruction(0, "0111....", InstructionCode.SUB, "sub r a"),
        new Instruction(0, "1000....", InstructionCode.JMP, "jmp a"),
        new Instruction(0, "1001....", InstructionCode.JN, "jn a"),
        new Instruction(0, "1010....", InstructionCode.JZ, "jz a"),
        new Instruction(0, "1011....", InstructionCode.JC, "jc a"),
        new Instruction(0, "1100....", InstructionCode.JSR, "jsr a"),
        new Instruction(1, "1101....", InstructionCode.NEG, "neg r"),
        new Instruction(1, "1110....", InstructionCode.SHR, "shr r"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("......00", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN),
        new AddressingMode("......01", AddressingModeCode.INDIRECT, "(.*),i"),
        new AddressingMode("......10", AddressingModeCode.IMMEDIATE, "#(.*)"),
        new AddressingMode("......11", AddressingModeCode.INDEXED_BY_X, "(.*),x")
      ],
      littleEndian: true
    });
  }

  public calculateInstructionNumBytes(instruction: Instruction, addressingModeCode: AddressingModeCode): number {
    if (instruction.getNumBytes() !== 0) {
      return instruction.getNumBytes();
    } else { // Variable number of bytes
      return (addressingModeCode === AddressingModeCode.IMMEDIATE) ? 2 : 3; // Immediate argument has only 1 byte
    }
  }

  public memoryGetOperandAddress(immediateAddress: number, addressingModeCode: AddressingModeCode): number {
    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT:
        return this.memoryReadTwoByteAddress(immediateAddress);

      case AddressingModeCode.INDIRECT:
        return this.memoryReadTwoByteAddress(this.memoryReadTwoByteAddress(immediateAddress));

      case AddressingModeCode.IMMEDIATE:
        return immediateAddress;

      case AddressingModeCode.INDEXED_BY_X:
        // Sum should be done in two's complement
        return this.address(this.memoryReadTwoByteAddress(immediateAddress) + this.toSigned(this.getRegisterValueByName("X")));

      default:
        return 0;
    }
  }

  public getNextOperandAddress(): { intermediateAddress: number, intermediateAddress2: number, finalOperandAddress: number } {
    const fetchedValue = this.getMemoryValue(this.getPCValue());
    const instruction = this.getInstructionFromValue(fetchedValue);
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);

    let intermediateAddress = -1;
    let intermediateAddress2 = -1;
    let finalOperandAddress = -1;

    if (!instruction || instruction.getNumBytes() !== 0) {
      return { intermediateAddress, intermediateAddress2, finalOperandAddress };
    }

    const immediateAddress = this.getPCValue() + 1;

    switch (addressingModeCode) {
      case AddressingModeCode.DIRECT:
        finalOperandAddress = this.getMemoryTwoByteAddress(immediateAddress);
        break;

      case AddressingModeCode.INDIRECT:
        intermediateAddress = this.getMemoryTwoByteAddress(immediateAddress);
        intermediateAddress2 = this.address(intermediateAddress + 1); // Second byte
        finalOperandAddress = this.getMemoryTwoByteAddress(intermediateAddress);
        break;

      case AddressingModeCode.IMMEDIATE:
        finalOperandAddress = immediateAddress;
        break;

      case AddressingModeCode.INDEXED_BY_X: // TODO: Duplicate?
        // Sum should be done in two's complement
        finalOperandAddress = this.address(this.getMemoryTwoByteAddress(immediateAddress) + this.toSigned(this.getRegisterValueByName("X")));
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        break;
    }

    return { intermediateAddress, intermediateAddress2, finalOperandAddress };
  }

  public generateArgumentsString(address: number, instruction: Instruction, addressingModeCode: AddressingModeCode): { argument: string, argumentsSize: number } {
    const addressingModePattern = this.getAddressingModePattern(addressingModeCode);

    // Calculate size of argument
    const argumentsSize = this.calculateInstructionNumBytes(instruction, addressingModeCode) - 1;

    // Get argument
    const argumentValue = (argumentsSize === 2) ? this.getMemoryTwoByteAddress(address + 1) : this.getMemoryValue(address + 1);
    let argument = String(argumentValue);

    // Add addressing mode syntax
    if (addressingModePattern !== AddressingMode.NO_PATTERN) {
      // Surround argument string with the corresponding addressing mode syntax
      argument = addressingModePattern.replace("(.*)", argument).toUpperCase();
    }

    return { argument, argumentsSize };
  }

}
