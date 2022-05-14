/* eslint-disable no-multi-spaces */

import { Machine } from "../Machine";
import { Register } from "../Register";
import { Flag, FlagCode } from "../Flag";
import { Instruction, InstructionCode } from "../Instruction";
import { AddressingMode, AddressingModeCode } from "../AddressingMode";
import { RegExpMatcher } from "../utils/RegExpMatcher";

function patternToMatcher(pattern: string): RegExpMatcher {
  const patternWithGroups = pattern.replace(/([-()+])/g, "\\$1").replace("r", "(?<register>[Rr][0-7])").replace("o", "(?<offset>-?\\w+)");
  return new RegExpMatcher(patternWithGroups, "i");
}

export class Cesar extends Machine {

  constructor() {
    super({
      name: "Cesar",
      identifier: "C16",
      memorySize: 65536,
      flags: [
        new Flag(FlagCode.NEGATIVE, "N"),
        new Flag(FlagCode.ZERO,     "Z", true),
        new Flag(FlagCode.OVERFLOW, "V"),
        new Flag(FlagCode.CARRY,    "C")
      ],
      registers: [
        new Register("R0", "000", 16),
        new Register("R1", "001", 16),
        new Register("R2", "010", 16),
        new Register("R3", "011", 16),
        new Register("R4", "100", 16),
        new Register("R5", "101", 16),
        new Register("R6", "110", 16, false), // SP
        new Register("R7", "111", 16, false)  // PC
      ],
      instructions: [
        new Instruction(1, "0000....", InstructionCode.NOP, "nop"),

        // Condition codes
        new Instruction(1, "0001....", InstructionCode.CCC, "ccc f"), // 0001nzvc
        new Instruction(1, "0010....", InstructionCode.SCC, "scc f"), // 0010nzvc

        // Conditional branching
        new Instruction(2, "00110000", InstructionCode.BR,  "br o"),  // 00110000 oooooooo
        new Instruction(2, "00110001", InstructionCode.BNE, "bne o"), // [...]
        new Instruction(2, "00110010", InstructionCode.BEQ, "beq o"),
        new Instruction(2, "00110011", InstructionCode.BPL, "bpl o"),
        new Instruction(2, "00110100", InstructionCode.BMI, "bmi o"),
        new Instruction(2, "00110101", InstructionCode.BVC, "bvc o"),
        new Instruction(2, "00110110", InstructionCode.BVS, "bvs o"),
        new Instruction(2, "00110111", InstructionCode.BCC, "bcc o"),
        new Instruction(2, "00111000", InstructionCode.BCS, "bcs o"),
        new Instruction(2, "00111001", InstructionCode.BGE, "bge o"),
        new Instruction(2, "00111010", InstructionCode.BLT, "blt o"),
        new Instruction(2, "00111011", InstructionCode.BGT, "bgt o"),
        new Instruction(2, "00111100", InstructionCode.BLE, "ble o"),
        new Instruction(2, "00111101", InstructionCode.BHI, "bhi o"),
        new Instruction(2, "00111110", InstructionCode.BLS, "bls o"),

        // Jumps / Subroutines
        new Instruction(0, "0100....", InstructionCode.JMP, "jmp a"),   // 0100.... ..mmmrrr
        new Instruction(2, "0101....", InstructionCode.SOB, "sob r o"), // 0101.rrr oooooooo
        new Instruction(0, "0110....", InstructionCode.JSR, "jsr r a"), // 0110.rrr ..mmmrrr
        new Instruction(1, "0111....", InstructionCode.RTS, "rts r"),   // 0111.rrr

        // Arithmetic (one operand)
        new Instruction(0, "10000000", InstructionCode.CLR, "clr a"), // 10000000 ..mmmrrr
        new Instruction(0, "10000001", InstructionCode.NOT, "not a"), // [...]
        new Instruction(0, "10000010", InstructionCode.INC, "inc a"),
        new Instruction(0, "10000011", InstructionCode.DEC, "dec a"),
        new Instruction(0, "10000100", InstructionCode.NEG, "neg a"),
        new Instruction(0, "10000101", InstructionCode.TST, "tst a"),
        new Instruction(0, "10000110", InstructionCode.ROR, "ror a"),
        new Instruction(0, "10000111", InstructionCode.ROL, "rol a"),
        new Instruction(0, "10001000", InstructionCode.ASR, "asr a"),
        new Instruction(0, "10001001", InstructionCode.ASL, "asl a"),
        new Instruction(0, "10001010", InstructionCode.ADC, "adc a"),
        new Instruction(0, "10001011", InstructionCode.SBC, "sbc a"),

        // Arithmetic (two operands)
        new Instruction(0, "1001....", InstructionCode.MOV, "mov a0 a1"), // 1001mmmr rrmmmrrr
        new Instruction(0, "1010....", InstructionCode.ADD, "add a0 a1"), // [...]
        new Instruction(0, "1011....", InstructionCode.SUB, "sub a0 a1"),
        new Instruction(0, "1100....", InstructionCode.CMP, "cmp a0 a1"),
        new Instruction(0, "1101....", InstructionCode.AND, "and a0 a1"),
        new Instruction(0, "1110....", InstructionCode.OR,  "or a0 a1"),

        new Instruction(1, "1111....", InstructionCode.HLT, "hlt")
      ],
      addressingModes: [
        new AddressingMode("000", AddressingModeCode.REGISTER,                   "r",      patternToMatcher), // TODO: AddressingMode.NO_PATTERN
        new AddressingMode("001", AddressingModeCode.REGISTER_POST_INC,          "(r)+",   patternToMatcher), // Immediate: #a => (R7)+ a
        new AddressingMode("010", AddressingModeCode.REGISTER_PRE_DEC,           "-(r)",   patternToMatcher),
        new AddressingMode("011", AddressingModeCode.REGISTER_INDEXED,           "o(r)",   patternToMatcher),
        new AddressingMode("100", AddressingModeCode.INDIRECT_REGISTER,          "(r)",    patternToMatcher),
        new AddressingMode("101", AddressingModeCode.INDIRECT_REGISTER_POST_INC, "((r)+)", patternToMatcher), // Direct: a => ((R7)+) a
        new AddressingMode("110", AddressingModeCode.INDIRECT_REGISTER_PRE_DEC,  "(-(r))", patternToMatcher),
        new AddressingMode("111", AddressingModeCode.INDIRECT_REGISTER_INDEXED,  "(o(r))", patternToMatcher)
      ],
      immediateNumBytes: 2,
      pcName: "R7"
    });

  }

}
