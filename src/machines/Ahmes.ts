import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Ahmes extends Machine {

  constructor() {
    super({
      name: "Ahmes",
      identifier: "AHM",
      memorySize: 256,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO, "Z", true),
        new Flag(FlagCode.OVERFLOW_FLAG, "V"),
        new Flag(FlagCode.CARRY, "C"),
        new Flag(FlagCode.BORROW, "B")
      ],
      registers: [
        new Register("AC", "........", 8),
        new Register("PC", "", 8, false)
      ],
      instructions: [
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),
        new Instruction(2, "0001....", InstructionCode.STR, "sta a"),
        new Instruction(2, "0010....", InstructionCode.LDR, "lda a"),
        new Instruction(2, "0011....", InstructionCode.ADD, "add a"),
        new Instruction(2, "0100....", InstructionCode.OR, "or a"),
        new Instruction(2, "0101....", InstructionCode.AND, "and a"),
        new Instruction(1, "0110....", InstructionCode.NOT, "not"),
        new Instruction(2, "0111....", InstructionCode.SUB, "sub a"),
        new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"),
        new Instruction(2, "100100..", InstructionCode.JN, "jn a"),
        new Instruction(2, "100101..", InstructionCode.JP, "jp a"),
        new Instruction(2, "100110..", InstructionCode.JV, "jv a"),
        new Instruction(2, "100111..", InstructionCode.JNV, "jnv a"),
        new Instruction(2, "101000..", InstructionCode.JZ, "jz a"),
        new Instruction(2, "101001..", InstructionCode.JNZ, "jnz a"),
        new Instruction(2, "101100..", InstructionCode.JC, "jc a"),
        new Instruction(2, "101101..", InstructionCode.JNC, "jnc a"),
        new Instruction(2, "101110..", InstructionCode.JB, "jb a"),
        new Instruction(2, "101111..", InstructionCode.JNB, "jnb a"),
        new Instruction(1, "1110..00", InstructionCode.SHR, "shr"),
        new Instruction(1, "1110..01", InstructionCode.SHL, "shl"),
        new Instruction(1, "1110..10", InstructionCode.ROR, "ror"),
        new Instruction(1, "1110..11", InstructionCode.ROL, "rol"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN)
      ]
    });

  }

}
