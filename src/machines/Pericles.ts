import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Pericles extends Machine {

  constructor() {
    super();
    this.identifier = "PRC";

    this.littleEndian = true;

    //////////////////////////////////////////////////
    // Initialize registers
    //////////////////////////////////////////////////

    this.registers.push(new Register("A", "....00..", 8));
    this.registers.push(new Register("B", "....01..", 8));
    this.registers.push(new Register("X", "....10..", 8));
    this.registers.push(new Register("PC", "", 12, false));

    this.PC = this.registers[this.registers.length - 1];

    //////////////////////////////////////////////////
    // Initialize memory
    //////////////////////////////////////////////////

    this.setMemorySize(4096);

    //////////////////////////////////////////////////
    // Initialize flags
    //////////////////////////////////////////////////

    this.flags.push(new Flag(FlagCode.NEGATIVE, "N"));
    this.flags.push(new Flag(FlagCode.ZERO, "Z", true));
    this.flags.push(new Flag(FlagCode.CARRY, "C"));

    //////////////////////////////////////////////////
    // Initialize instructions
    //////////////////////////////////////////////////

    this.instructions.push(new Instruction(1, "0000....", InstructionCode.NOP, "nop"));
    this.instructions.push(new Instruction(0, "0001....", InstructionCode.STR, "str r a"));
    this.instructions.push(new Instruction(0, "0010....", InstructionCode.LDR, "ldr r a"));
    this.instructions.push(new Instruction(0, "0011....", InstructionCode.ADD, "add r a"));
    this.instructions.push(new Instruction(0, "0100....", InstructionCode.OR, "or r a"));
    this.instructions.push(new Instruction(0, "0101....", InstructionCode.AND, "and r a"));
    this.instructions.push(new Instruction(1, "0110....", InstructionCode.NOT, "not r"));
    this.instructions.push(new Instruction(0, "0111....", InstructionCode.SUB, "sub r a"));
    this.instructions.push(new Instruction(0, "1000....", InstructionCode.JMP, "jmp a"));
    this.instructions.push(new Instruction(0, "1001....", InstructionCode.JN, "jn a"));
    this.instructions.push(new Instruction(0, "1010....", InstructionCode.JZ, "jz a"));
    this.instructions.push(new Instruction(0, "1011....", InstructionCode.JC, "jc a"));
    this.instructions.push(new Instruction(0, "1100....", InstructionCode.JSR, "jsr a"));
    this.instructions.push(new Instruction(1, "1101....", InstructionCode.NEG, "neg r"));
    this.instructions.push(new Instruction(1, "1110....", InstructionCode.SHR, "shr r"));
    this.instructions.push(new Instruction(1, "1111....", InstructionCode.HLT, "hlt"));

    //////////////////////////////////////////////////
    // Initialize addressing modes
    //////////////////////////////////////////////////

    this.addressingModes.push(new AddressingMode("......00", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN));
    this.addressingModes.push(new AddressingMode("......01", AddressingModeCode.INDIRECT, "(.*),i"));
    this.addressingModes.push(new AddressingMode("......10", AddressingModeCode.IMMEDIATE, "#(.*)"));
    this.addressingModes.push(new AddressingMode("......11", AddressingModeCode.INDEXED_BY_X, "(.*),x"));
  }

  // Returns number of bytes reserved
  public calculateBytesToReserve(addressArgument: string): number {
    const { addressingModeCode } = this.extractArgumentAddressingModeCode(addressArgument);
    return (addressingModeCode === AddressingModeCode.IMMEDIATE) ? 2 : 3; // Immediate requires only 2 bytes
  }

  public decodeInstruction(fetchedValue: number, instruction: Instruction): { addressingModeCode: AddressingModeCode, registerName: string, immediateAddress: number } {
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);
    const registerName = this.extractRegisterName(fetchedValue);
    let immediateAddress = 0;

    if (instruction && instruction.getNumBytes() === 0) { // If instruction has variable number of bytes
      immediateAddress = this.getPCValue(); // Address that contains first argument byte

      // Skip argument bytes
      this.incrementPCValue();
      if (addressingModeCode !== AddressingModeCode.IMMEDIATE) { // Immediate argument has only 1 byte
        this.incrementPCValue();
      }
    }

    return { addressingModeCode, registerName, immediateAddress };
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
        return this.address(this.memoryReadTwoByteAddress(immediateAddress) + this.getRegisterValueByName("X"));

      default:
        return 0;
    }
  }

  public getNextOperandAddress(): { intermediateAddress: number, intermediateAddress2: number, finalOperandAddress: number } {
    const fetchedValue = this.getMemoryValue(this.PC.getValue());
    const instruction = this.getInstructionFromValue(fetchedValue);
    const addressingModeCode = this.extractAddressingModeCode(fetchedValue);

    let intermediateAddress = -1;
    let intermediateAddress2 = -1;
    let finalOperandAddress = -1;

    if (!instruction || instruction.getNumBytes() !== 0) {
      return { intermediateAddress, intermediateAddress2, finalOperandAddress };
    }

    const immediateAddress = this.PC.getValue() + 1;

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

      case AddressingModeCode.INDEXED_BY_X:
        finalOperandAddress = this.address(this.getMemoryTwoByteAddress(immediateAddress) + this.getRegisterValueByName("X"));
        break;

      case AddressingModeCode.INDEXED_BY_PC:
        break;
    }

    return { intermediateAddress, intermediateAddress2, finalOperandAddress };
  }

  public generateArgumentsString(address: number, instruction: Instruction, addressingModeCode: AddressingModeCode): { argument: string, argumentsSize: number} {
    const addressingModePattern = this.getAddressingModePattern(addressingModeCode);

    // Calculate size of argument
    let argumentsSize;
    if (instruction.getNumBytes() === 0) { // Instruction with variable number of bytes
      argumentsSize = (addressingModeCode === AddressingModeCode.IMMEDIATE) ? 1 : 2;
    } else {
      argumentsSize = instruction.getNumBytes() - 1;
    }

    // Get argument
    const argumentValue = (argumentsSize === 2) ? this.getMemoryTwoByteAddress(address + 1) : this.getMemoryValue(address + 1);
    let argument = String(argumentValue);

    // Add addressing mode syntax
    if (addressingModePattern !== AddressingMode.NO_PATTERN) {
      argument = addressingModePattern.replace("(.*)", argument).toUpperCase();
    }

    return { argument, argumentsSize };
  }

  public memoryReadTwoByteAddress(address: number): number {
    return this.memoryRead(address) + (this.memoryRead(address + 1) << 8);
  }

  public getMemoryTwoByteAddress(address: number): number {
    return this.getMemoryValue(address) + (this.getMemoryValue(address + 1) << 8);
  }

}