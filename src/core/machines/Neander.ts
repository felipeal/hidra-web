import { Machine } from "../Machine";
import { Register } from "../Register";
import { Flag, FlagCode } from "../Flag";
import { Instruction, InstructionCode } from "../Instruction";
import { AddressingMode, AddressingModeCode } from "../AddressingMode";

export class Neander extends Machine {

  constructor() {
    super({
      name: "Neander",
      identifier: "NDR",
      fileExtension: "ned",
      memorySize: 256,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO, "Z", true)
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
        new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"),
        new Instruction(2, "1001....", InstructionCode.JN, "jn a"),
        new Instruction(2, "1010....", InstructionCode.JZ, "jz a"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN)
      ]
    });
  }
}
