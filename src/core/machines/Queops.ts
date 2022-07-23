import { AddressingMode, AddressingModeCode } from "../AddressingMode";
import { Flag, FlagCode } from "../Flag";
import { Instruction, InstructionCode } from "../Instruction";
import { Machine } from "../Machine";
import { Register } from "../Register";

export class Queops extends Machine {

  constructor() {
    super({
      name: "Queops",
      identifier: "QPS",
      fileExtension: "qpd",
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
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),
        new Instruction(2, "0001....", InstructionCode.STR, "str a"),
        new Instruction(2, "0010....", InstructionCode.LDR, "ldr a"),
        new Instruction(2, "0011....", InstructionCode.ADD, "add a"),
        new Instruction(2, "0100....", InstructionCode.OR, "or a"),
        new Instruction(2, "0101....", InstructionCode.AND, "and a"),
        new Instruction(1, "0110....", InstructionCode.NOT, "not"),
        new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"),
        new Instruction(2, "1001....", InstructionCode.JN, "jn a"),
        new Instruction(2, "1010....", InstructionCode.JZ, "jz a"),
        new Instruction(2, "1011....", InstructionCode.JC, "jc a"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("......00", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN),
        new AddressingMode("......01", AddressingModeCode.INDIRECT, "a,I"),
        new AddressingMode("......10", AddressingModeCode.IMMEDIATE, "#a"),
        new AddressingMode("......11", AddressingModeCode.INDEXED_BY_PC, "a,PC")
      ]
    });
  }

}
