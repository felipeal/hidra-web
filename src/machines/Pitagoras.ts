import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Pitagoras extends Machine {

  constructor() {
    super();
    this.name = "Pitagoras";
    this.identifier = "PTG"; // TODO: Confirmar c/Weber

    //////////////////////////////////////////////////
    // Initialize registers
    //////////////////////////////////////////////////

    this.registers.push(new Register("A", "........", 8));
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

    this.instructions.push(new Instruction(1, "00000000", InstructionCode.NOP, "nop"));
    this.instructions.push(new Instruction(2, "00010000", InstructionCode.STR, "sta a"));
    this.instructions.push(new Instruction(2, "00100000", InstructionCode.LDR, "lda a"));
    this.instructions.push(new Instruction(2, "00110000", InstructionCode.ADD, "add a"));
    this.instructions.push(new Instruction(2, "01000000", InstructionCode.OR,  "or a"));
    this.instructions.push(new Instruction(2, "01010000", InstructionCode.AND, "and a"));
    this.instructions.push(new Instruction(1, "01100000", InstructionCode.NOT, "not"));
    this.instructions.push(new Instruction(2, "01110000", InstructionCode.SUB, "sub a"));
    this.instructions.push(new Instruction(2, "10000000", InstructionCode.JMP, "jmp a"));
    this.instructions.push(new Instruction(2, "10010000", InstructionCode.JN,  "jn a"));
    this.instructions.push(new Instruction(2, "10011100", InstructionCode.JP,  "jp a"));
    this.instructions.push(new Instruction(2, "10100000", InstructionCode.JZ,  "jz a"));
    this.instructions.push(new Instruction(2, "10101100", InstructionCode.JNZ, "jd a"));
    this.instructions.push(new Instruction(2, "10110000", InstructionCode.JC,  "jc a"));
    this.instructions.push(new Instruction(2, "10111100", InstructionCode.JNC, "jb a"));
    this.instructions.push(new Instruction(1, "11100000", InstructionCode.SHR, "shr"));
    this.instructions.push(new Instruction(1, "11100001", InstructionCode.SHL, "shl"));
    this.instructions.push(new Instruction(1, "11100010", InstructionCode.ROR, "ror"));
    this.instructions.push(new Instruction(1, "11100011", InstructionCode.ROL, "rol"));
    this.instructions.push(new Instruction(1, "1111....", InstructionCode.HLT, "hlt"));

    //////////////////////////////////////////////////
    // Initialize addressing modes
    //////////////////////////////////////////////////

    this.addressingModes.push(new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN));
  }

}
