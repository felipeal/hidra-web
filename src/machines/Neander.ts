import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Neander extends Machine {

  constructor() {
    super();
    this.identifier = "NDR";

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
    this.instructions.push(new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"));
    this.instructions.push(new Instruction(2, "1001....", InstructionCode.JN,  "jn a"));
    this.instructions.push(new Instruction(2, "1010....", InstructionCode.JZ,  "jz a"));
    this.instructions.push(new Instruction(1, "1111....", InstructionCode.HLT, "hlt"));

    //////////////////////////////////////////////////
    // Initialize addressing modes
    //////////////////////////////////////////////////

    this.addressingModes.push(new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN));
  }

}
