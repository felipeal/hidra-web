import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Ramses extends Machine {

  constructor() {
    super();
    this.identifier = "RMS";

    //////////////////////////////////////////////////
    // Initialize registers
    //////////////////////////////////////////////////

    this.registers.push(new Register("A", "....00..", 8));
    this.registers.push(new Register("B", "....01..", 8));
    this.registers.push(new Register("X", "....10..", 8));
    this.registers.push(new Register("PC", "", 8, false));

    this.PC = this.registers[this.registers.length - 1];

    //////////////////////////////////////////////////
    // Initialize memory
    //////////////////////////////////////////////////

    this.setMemorySize(256);

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
    this.instructions.push(new Instruction(2, "0001....", InstructionCode.STR, "str r a"));
    this.instructions.push(new Instruction(2, "0010....", InstructionCode.LDR, "ldr r a"));
    this.instructions.push(new Instruction(2, "0011....", InstructionCode.ADD, "add r a"));
    this.instructions.push(new Instruction(2, "0100....", InstructionCode.OR, "or r a"));
    this.instructions.push(new Instruction(2, "0101....", InstructionCode.AND, "and r a"));
    this.instructions.push(new Instruction(1, "0110....", InstructionCode.NOT, "not r"));
    this.instructions.push(new Instruction(2, "0111....", InstructionCode.SUB, "sub r a"));
    this.instructions.push(new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"));
    this.instructions.push(new Instruction(2, "1001....", InstructionCode.JN, "jn a"));
    this.instructions.push(new Instruction(2, "1010....", InstructionCode.JZ, "jz a"));
    this.instructions.push(new Instruction(2, "1011....", InstructionCode.JC, "jc a"));
    this.instructions.push(new Instruction(2, "1100....", InstructionCode.JSR, "jsr a"));
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

}