import { Machine } from "../core/Machine";
import { Register } from "../core/Register";
import { Flag, FlagCode } from "../core/Flag";
import { Instruction, InstructionCode } from "../core/Instruction";
import { AddressingMode, AddressingModeCode } from "../core/AddressingMode";

export class Ramses extends Machine {

  constructor() {
    super({
      name: "Ramses",
      identifier: "RMS",
      memorySize: 256,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO, "Z", true),
        new Flag(FlagCode.CARRY, "C")
      ],
      registers: [
        new Register("A", "....00..", 8),
        new Register("B", "....01..", 8),
        new Register("X", "....10..", 8),
        new Register("PC", "", 8, false)
      ],
      instructions: [
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),
        new Instruction(2, "0001....", InstructionCode.STR, "str r a"),
        new Instruction(2, "0010....", InstructionCode.LDR, "ldr r a"),
        new Instruction(2, "0011....", InstructionCode.ADD, "add r a"),
        new Instruction(2, "0100....", InstructionCode.OR, "or r a"),
        new Instruction(2, "0101....", InstructionCode.AND, "and r a"),
        new Instruction(1, "0110....", InstructionCode.NOT, "not r"),
        new Instruction(2, "0111....", InstructionCode.SUB, "sub r a"),
        new Instruction(2, "1000....", InstructionCode.JMP, "jmp a"),
        new Instruction(2, "1001....", InstructionCode.JN, "jn a"),
        new Instruction(2, "1010....", InstructionCode.JZ, "jz a"),
        new Instruction(2, "1011....", InstructionCode.JC, "jc a"),
        new Instruction(2, "1100....", InstructionCode.JSR, "jsr a"),
        new Instruction(1, "1101....", InstructionCode.NEG, "neg r"),
        new Instruction(1, "1110....", InstructionCode.SHR, "shr r"),
        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("......00", AddressingModeCode.DIRECT, AddressingMode.NO_PATTERN),
        new AddressingMode("......01", AddressingModeCode.INDIRECT, "(.*),i"),
        new AddressingMode("......10", AddressingModeCode.IMMEDIATE, "#(.*)"),
        new AddressingMode("......11", AddressingModeCode.INDEXED_BY_X, "(.*),x")
      ]
    });

  }

}
