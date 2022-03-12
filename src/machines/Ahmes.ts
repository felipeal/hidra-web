import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Ahmes extends Machine {

  constructor() {
    super();
    this.identifier = "AHM";

    //////////////////////////////////////////////////
    // Initialize registers
    //////////////////////////////////////////////////

    this.registers.push(new Register("AC", "........", 8));
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
    this.flags.push(new Flag(FlagCode.OVERFLOW_FLAG, "V"));
    this.flags.push(new Flag(FlagCode.CARRY, "C"));
    this.flags.push(new Flag(FlagCode.BORROW, "B"));

    //////////////////////////////////////////////////
    // Initialize instructions
    //////////////////////////////////////////////////

    this.instructions.push(new Instruction(1, "0000....", InstructionCode.NOP, "nop"));
    this.instructions.push(new Instruction(2, "0001....", InstructionCode.STR, "sta a"));
    this.instructions.push(new Instruction(2, "0010....", InstructionCode.LDR, "lda a"));
    this.instructions.push(new Instruction(2, "0011....", InstructionCode.ADD, "add a"));
    this.instructions.push(new Instruction(2, "0100....", InstructionCode.OR,  "or a"));
    this.instructions.push(new Instruction(2, "0101....", InstructionCode.AND, "and a"));
    this.instructions.push(new Instruction(1, "0110....", InstructionCode.NOT, "not"));
    this.instructions.push(new Instruction(2, "0111....", InstructionCode.SUB, "sub a"));
    this.instructions.push(new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"));
    this.instructions.push(new Instruction(2, "100100..", InstructionCode.JN,  "jn a"));
    this.instructions.push(new Instruction(2, "100101..", InstructionCode.JP,  "jp a"));
    this.instructions.push(new Instruction(2, "100110..", InstructionCode.JV,  "jv a"));
    this.instructions.push(new Instruction(2, "100111..", InstructionCode.JNV, "jnv a"));
    this.instructions.push(new Instruction(2, "101000..", InstructionCode.JZ,  "jz a"));
    this.instructions.push(new Instruction(2, "101001..", InstructionCode.JNZ, "jnz a"));
    this.instructions.push(new Instruction(2, "101100..", InstructionCode.JC,  "jc a"));
    this.instructions.push(new Instruction(2, "101101..", InstructionCode.JNC, "jnc a"));
    this.instructions.push(new Instruction(2, "101110..", InstructionCode.JB,  "jb a"));
    this.instructions.push(new Instruction(2, "101111..", InstructionCode.JNB, "jnb a"));
    this.instructions.push(new Instruction(1, "1110..00", InstructionCode.SHR, "shr"));
    this.instructions.push(new Instruction(1, "1110..01", InstructionCode.SHL, "shl"));
    this.instructions.push(new Instruction(1, "1110..10", InstructionCode.ROR, "ror"));
    this.instructions.push(new Instruction(1, "1110..11", InstructionCode.ROL, "rol"));
    this.instructions.push(new Instruction(1, "1111....", InstructionCode.HLT, "hlt"));

    //////////////////////////////////////////////////
    // Initialize addressing modes
    //////////////////////////////////////////////////

    this.addressingModes.push(new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN));
  }

}