import { AddressingMode, AddressingModeCode } from "../AddressingMode";
import { Flag, FlagCode } from "../Flag";
import { Instruction, InstructionCode } from "../Instruction";
import { Machine } from "../Machine";
import { Register } from "../Register";

export class Pitagoras extends Machine {

  constructor() {
    super({
      name: "Pitagoras",
      identifier: "PTG", // Note: Not confirmed
      fileExtension: "ptd", // Unavailable: .pid, .pit
      memorySize: 256,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO, "Z", true),
        new Flag(FlagCode.CARRY, "C")
      ],
      registers: [
        new Register("A", "........", 8),
        new Register("PC", "", 8, false)
      ],
      instructions: [
        new Instruction(1, "00000000", InstructionCode.NOP, "nop"),
        new Instruction(2, "00010000", InstructionCode.STR, "sta a"),
        new Instruction(2, "00100000", InstructionCode.LDR, "lda a"),
        new Instruction(2, "00110000", InstructionCode.ADD, "add a"),
        new Instruction(2, "01000000", InstructionCode.OR, "or a"),
        new Instruction(2, "01010000", InstructionCode.AND, "and a"),
        new Instruction(1, "01100000", InstructionCode.NOT, "not"),
        new Instruction(2, "01110000", InstructionCode.SUB, "sub a"),
        new Instruction(2, "10000000", InstructionCode.JMP, "jmp a"),
        new Instruction(2, "10010000", InstructionCode.JN, "jn a"),
        new Instruction(2, "10011100", InstructionCode.JP, "jp a"),
        new Instruction(2, "10100000", InstructionCode.JZ, "jz a"),
        new Instruction(2, "10101100", InstructionCode.JNZ, "jd a"),
        new Instruction(2, "10110000", InstructionCode.JC, "jc a"),
        new Instruction(2, "10111100", InstructionCode.JNC, "jb a"),
        new Instruction(1, "11100000", InstructionCode.SHR, "shr"),
        new Instruction(1, "11100001", InstructionCode.SHL, "shl"),
        new Instruction(1, "11100010", InstructionCode.ROR, "ror"),
        new Instruction(1, "11100011", InstructionCode.ROL, "rol"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("........", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN)
      ]
    });

  }

}
