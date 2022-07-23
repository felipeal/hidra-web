/* eslint-disable no-multi-spaces */

import "./utils/CustomExtends";
import {
  makeFunction_expectBuildError, makeFunction_expectBuildSuccess, makeFunction_expectInstructionStrings, makeFunction_expectRunState
} from "./utils/MachineTestFunctions";
import { Cesar } from "../core/machines/Cesar";
import { CesarAssembler } from "../core/CesarAssembler";
import { AssemblerErrorCode } from "../core/AssemblerError";
import { assert } from "../core/utils/FunctionUtils";

const machine = new Cesar();
const assembler = new CesarAssembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectBuildError = makeFunction_expectBuildError(assembler);
const expectRunState = makeFunction_expectRunState(assembler, machine);
const expectInstructionStrings = makeFunction_expectInstructionStrings(assembler, machine);

function toBytes(word: number): number[] {
  return [(word & 0xFF00) >> 8, word & 0xFF];
}

describe("Cesar: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0b00000000]);

    expectBuildSuccess("ccc nz", [0b00011100]);
    expectBuildSuccess("scc vc", [0b00100011]);

    // Conditional branching
    expectBuildSuccess("br 127",  [0b00110000, 127]);
    expectBuildSuccess("bne 127", [0b00110001, 127]);
    expectBuildSuccess("beq 127", [0b00110010, 127]);
    expectBuildSuccess("bpl 127", [0b00110011, 127]);
    expectBuildSuccess("bmi 127", [0b00110100, 127]);
    expectBuildSuccess("bvc 127", [0b00110101, 127]);
    expectBuildSuccess("bvs 127", [0b00110110, 127]);
    expectBuildSuccess("bcc 127", [0b00110111, 127]);
    expectBuildSuccess("bcs 127", [0b00111000, 127]);
    expectBuildSuccess("bge 127", [0b00111001, 127]);
    expectBuildSuccess("blt 127", [0b00111010, 127]);
    expectBuildSuccess("bgt 127", [0b00111011, 127]);
    expectBuildSuccess("ble 127", [0b00111100, 127]);
    expectBuildSuccess("bhi 127", [0b00111101, 127]);
    expectBuildSuccess("bls 127", [0b00111110, 127]);

    // Flow control
    expectBuildSuccess("jmp (r0)",     [0b01000000, 0x20]);
    expectBuildSuccess("sob r0, 127",  [0b01010000, 127]);
    expectBuildSuccess("jsr r0, (r0)", [0b01100000, 0x20]);
    expectBuildSuccess("jsr r0, (r0)", [0b01100000, 0x20]);
    expectBuildSuccess("rts r0",       [0b01110000]);

    // Arithmetic (one operand)
    expectBuildSuccess("clr r0", [0b10000000]);
    expectBuildSuccess("not r0", [0b10000001]);
    expectBuildSuccess("inc r0", [0b10000010]);
    expectBuildSuccess("dec r0", [0b10000011]);
    expectBuildSuccess("neg r0", [0b10000100]);
    expectBuildSuccess("tst r0", [0b10000101]);
    expectBuildSuccess("ror r0", [0b10000110]);
    expectBuildSuccess("rol r0", [0b10000111]);
    expectBuildSuccess("asr r0", [0b10001000]);
    expectBuildSuccess("asl r0", [0b10001001]);
    expectBuildSuccess("adc r0", [0b10001010]);
    expectBuildSuccess("sbc r0", [0b10001011]);

    // Arithmetic (two operands)
    expectBuildSuccess("mov r0, r0", [0b10010000]);
    expectBuildSuccess("add r0, r0", [0b10100000]);
    expectBuildSuccess("sub r0, r0", [0b10110000]);
    expectBuildSuccess("cmp r0, r0", [0b11000000]);
    expectBuildSuccess("and r0, r0", [0b11010000]);
    expectBuildSuccess("or r0, r0",  [0b11100000]);

    expectBuildSuccess("hlt", [0b11110000]);
  });

  test("addressing modes: should build correct binary", () => {
    // Stored in the 2nd byte (one operand)
    expectBuildSuccess("clr r0", [0x80, 0]);
    expectBuildSuccess("clr (r0)+", [0x80, 8]);
    expectBuildSuccess("clr -(r0)", [0x80, 16]);
    expectBuildSuccess("clr 32769(r0)", [0x80, 24, ...toBytes(32769)]);
    expectBuildSuccess("clr (r0)", [0x80, 32]);
    expectBuildSuccess("clr ((r0)+)", [0x80, 40]);
    expectBuildSuccess("clr (-(r0))", [0x80, 48]);
    expectBuildSuccess("clr (32769(r0))", [0x80, 56, ...toBytes(32769)]);

    // Stored in the 1st byte (two operands)
    expectBuildSuccess("mov r0, r0", [0x90, 0]);
    expectBuildSuccess("mov (r0)+, r0", [0x92, 0]);
    expectBuildSuccess("mov -(r0), r0", [0x94, 0]);
    expectBuildSuccess("mov 32769(r0), r0", [0x96, 0, ...toBytes(32769)]);
    expectBuildSuccess("mov (r0), r0", [0x98, 0]);
    expectBuildSuccess("mov ((r0)+), r0", [0x9A, 0]);
    expectBuildSuccess("mov (-(r0)), r0", [0x9C, 0]);
    expectBuildSuccess("mov (32769(r0)), r0", [0x9E, 0, ...toBytes(32769)]);

    // Both operands
    expectBuildSuccess("mov (r0)+, -(r0)", [0x92, 16]);
    expectBuildSuccess("mov 32769(r0), (32770(r0))", [0x96, 56, ...toBytes(32769), ...toBytes(32770)]);

    // Non-arithmetic
    expectBuildSuccess("jmp (r0)+", [0x40, 8]);
    expectBuildSuccess("jmp 32769(r0)", [0x40, 24, ...toBytes(32769)]);
    expectBuildSuccess("jsr r0, (r0)+", [0x60, 8]);
    expectBuildSuccess("jsr r0, 32769(r0)", [0x60, 24, ...toBytes(32769)]);
  });

  test("registers: should build correct binary", () => {
    expectBuildSuccess("jmp (r1)", [0b01000000, 0b00100001]);
    expectBuildSuccess("jmp (r4)", [0b01000000, 0b00100100]);
    expectBuildSuccess("jmp (r7)", [0b01000000, 0b00100111]);

    expectBuildSuccess("jsr r1, (r1)", [0b01100001, 0b00100001]);
    expectBuildSuccess("jsr r1, (r4)", [0b01100001, 0b00100100]);
    expectBuildSuccess("jsr r1, (r7)", [0b01100001, 0b00100111]);
    expectBuildSuccess("jsr r4, (r1)", [0b01100100, 0b00100001]);
    expectBuildSuccess("jsr r7, (r1)", [0b01100111, 0b00100001]);

    expectBuildSuccess("clr (r1)", [0x80, 0b00100001]);
    expectBuildSuccess("clr (r4)", [0x80, 0b00100100]);
    expectBuildSuccess("clr (r7)", [0x80, 0b00100111]);

    expectBuildSuccess("mov (r1)+, -(r1)", [0b10010010, 0b01010001]);
    expectBuildSuccess("mov (r1)+, -(r4)", [0b10010010, 0b01010100]);
    expectBuildSuccess("mov (r1)+, -(r7)", [0b10010010, 0b01010111]);
    expectBuildSuccess("mov (r4)+, -(r1)", [0b10010011, 0b00010001]);
    expectBuildSuccess("mov (r7)+, -(r1)", [0b10010011, 0b11010001]);
  });

  test("ccc/scc: should build correct binary", () => {
    expectBuildSuccess(["ccc"], [0b00010000]); // Zero arguments
    expectBuildSuccess(["ccc n", "scc z", "ccc v", "scc c"], [0b00011000, 0b00100100, 0b00010010, 0b00100001]); // One argument
    expectBuildSuccess(["ccc nz", "ccc nzv", "ccc cvzn"], [0b00011100, 0b00011110, 0b00011111]); // Concatenated arguments
    expectBuildSuccess(["ccc n,z, v ,c", "ccc c , v  ,  z"], [0b00011111, 0b00010111]); // Comma with optional spaces before/after
    expectBuildSuccess(["ccc n z", "ccc c  v"], [0b00011100, 0b00010011]); // Multiple spaces
    expectBuildSuccess(["ccc n, z c"], [0b00011101]); // Mixed commas/spaces
    expectBuildSuccess(["ccc Nc", "scc n, C"], [0b00011001, 0b00101001]); // Case insensitive
  });

  test("ccc/scc: should reject invalid syntax", () => {
    expectBuildError(["ccc n, f"],  AssemblerErrorCode.INVALID_ARGUMENT); // Invalid flag
    expectBuildError(["ccc n, n"],  AssemblerErrorCode.INVALID_ARGUMENT); // Duplicate flag
    expectBuildError(["ccc n, zv"], AssemblerErrorCode.INVALID_ARGUMENT); // Concatenating when using separators
    expectBuildError(["ccc n,, z"], AssemblerErrorCode.INVALID_ARGUMENT); // Multiple commas
  });

  test("PC label offset: should build correct binary", () => {
    const label = ["org 1025", "Label: DW"];

    // R0..R6: Absolute label address used (1025)
    expectBuildSuccess(["jmp Label(r0)", "jmp Label(r0)",     ...label], [0x40, 0x18, ...toBytes(1025), 0x40, 0x18, ...toBytes(1025)]);
    expectBuildSuccess(["jmp (Label(r6))", "jmp (Label(r6))", ...label], [0x40, 0x3E, ...toBytes(1025), 0x40, 0x3E, ...toBytes(1025)]);

    // R7: Relative label address used (1021 and 1017)
    expectBuildSuccess(["jmp Label(r7)", "jmp Label(r7)",     ...label], [0x40, 0x1F, ...toBytes(1021), 0x40, 0x1F, ...toBytes(1017)]);
    expectBuildSuccess(["jmp (Label(r7))", "jmp (Label(r7))", ...label], [0x40, 0x3F, ...toBytes(1021), 0x40, 0x3F, ...toBytes(1017)]);

    // MOV: mixed scenarios
    expectBuildSuccess(["mov Label(r6), Label(r7)",   ...label], [0x97, 0x9F, ...toBytes(1025), ...toBytes(1019)]);
    expectBuildSuccess(["mov Label(r6), (Label(r7))", ...label], [0x97, 0xBF, ...toBytes(1025), ...toBytes(1019)]);
    expectBuildSuccess(["mov Label(r7), Label(r6)",   ...label], [0x97, 0xDE, ...toBytes(1021), ...toBytes(1025)]);
    expectBuildSuccess(["mov (Label(r7)), Label(r6)", ...label], [0x9F, 0xDE, ...toBytes(1021), ...toBytes(1025)]);
    expectBuildSuccess(["mov Label(r7), (Label(r7))", ...label], [0x97, 0xFF, ...toBytes(1021), ...toBytes(1019)]);
    expectBuildSuccess(["mov (Label(r7)), Label(r7)", ...label], [0x9F, 0xDF, ...toBytes(1021), ...toBytes(1019)]);
  });

  // TODO: Test offsets with branch and SOB

  // TODO: Test direct and immediate addressing modes

  // TODO: Test "Zero: DW Zero-32769"

  // TODO: Disallow mode 0 for jumps

  // TODO: Test "Zero: DB Zero" -> "ponteiro de 8 bits" -- applies to Pericles

  // TODO: Test I/O on memory area (should only affect operands)

  // TODO: Test keyboard bits

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
    // TODO: Test with each mode
  });

  test("reserved keywords: should build correct list", () => {
    expect(assembler["buildReservedKeywordsList"]()).toEqual([
      "org", "db", "dw", "dab", "daw",
      "nop",
      "ccc", "scc",
      "br", "bne", "beq", "bpl", "bmi", "bvc", "bvs", "bcc", "bcs", "bge", "blt", "bgt", "ble", "bhi", "bls",
      "jmp", "sob", "jsr", "rts",
      "clr", "not", "inc", "dec", "neg", "tst", "ror", "rol", "asr", "asl", "adc", "sbc",
      "mov", "add", "sub", "cmp", "and", "or",
      "hlt",
      "r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"
    ]);
  });

});

function expectBranchState(instruction: string, flags: string, taken: boolean) {
  assert(!flags.match(/[^NZVC]/), `Invalid flags: ${flags}`);
  expectRunState(["ccc NZVC", `scc ${flags}`, `${instruction} 127`], [], {
    f_N: flags.includes("N"),
    f_Z: flags.includes("Z"),
    f_V: flags.includes("V"),
    f_C: flags.includes("C"),
    r_R7: taken ? (4 + 127) : 4
  });
}

function expectBranchTaken(instruction: string, flags = "") {
  expectBranchState(instruction, flags, true);
}

function expectBranchNotTaken(instruction: string, flags = "") {
  expectBranchState(instruction, flags, false);
}

function flags(flags: string) {
  assert(!flags.match(/[^NZVC]/), `Invalid flags: ${flags}`);
  return {
    f_N: flags.includes("N"),
    f_Z: flags.includes("Z"),
    f_V: flags.includes("V"),
    f_C: flags.includes("C")
  };
}

describe("Cesar: Run", () => {

  test("nop / hlt: should reach expected state after running", () => {
    expectRunState(["nop"], [], { f_N: false, f_Z: true, r_R7: 1 });

    expectRunState(["nop", "nop"], [], { isRunning: true, r_R7: 2 });
    expectRunState(["hlt", "nop"], [], { isRunning: false, r_R7: 1 });
  });

  test("nop / hlt: should preserve flags", () => {
    expectRunState(["scc NZVC", "nop", "hlt"], [], { isRunning: false, r_R7: 3, ...flags("NZVC") });
    expectRunState(["ccc NZVC", "nop", "hlt"], [], { isRunning: false, r_R7: 3, ...flags("") });
  });

  test("condition codes: should reach expected state after running", () => {
    expectRunState(["scc",      "ccc"],      [], { f_N: false, f_Z: true,  f_V: false, f_C: false, r_R7: 2 }); // Initial state
    expectRunState(["ccc NZVC", "scc NZVC"], [], { f_N: true,  f_Z: true,  f_V: true,  f_C: true,  r_R7: 2 }); // All set
    expectRunState(["scc NZVC", "ccc NZVC"], [], { f_N: false, f_Z: false, f_V: false, f_C: false, r_R7: 2 }); // All cleared
    expectRunState(["ccc NZVC", "scc N"],    [], { f_N: true,  f_Z: false, f_V: false, f_C: false, r_R7: 2 }); // Set N
    expectRunState(["ccc NZVC", "scc Z"],    [], { f_N: false, f_Z: true,  f_V: false, f_C: false, r_R7: 2 }); // Set Z
    expectRunState(["ccc NZVC", "scc V"],    [], { f_N: false, f_Z: false, f_V: true,  f_C: false, r_R7: 2 }); // Set V
    expectRunState(["ccc NZVC", "scc C"],    [], { f_N: false, f_Z: false, f_V: false, f_C: true,  r_R7: 2 }); // Set C
    expectRunState(["scc NZVC", "ccc N"],    [], { f_N: false, f_Z: true,  f_V: true,  f_C: true,  r_R7: 2 }); // Clear N
    expectRunState(["scc NZVC", "ccc Z"],    [], { f_N: true,  f_Z: false, f_V: true,  f_C: true,  r_R7: 2 }); // Clear Z
    expectRunState(["scc NZVC", "ccc V"],    [], { f_N: true,  f_Z: true,  f_V: false, f_C: true,  r_R7: 2 }); // Clear V
    expectRunState(["scc NZVC", "ccc C"],    [], { f_N: true,  f_Z: true,  f_V: true,  f_C: false, r_R7: 2 }); // Clear C
  });

  test("conditional branching: should reach expected state after running", () => {
    // BR: Always taken
    expectRunState(["br 127"], [], { r_R7: 2 + 127 }); // Positive offset
    expectRunState(["br -128"], [], { r_R7: 65536 + 2 - 128 }); // Negative offset

    // BNE: Taken when Z = 0
    expectBranchTaken("bne");
    expectBranchNotTaken("bne", "Z");

    // BEQ: Taken when Z = 1
    expectBranchTaken("beq", "Z");
    expectBranchNotTaken("beq");

    // BPL: Taken when N = 0
    expectBranchTaken("bpl");
    expectBranchNotTaken("bpl", "N");

    // BMI: Taken when N = 1
    expectBranchTaken("bmi", "N");
    expectBranchNotTaken("bmi");

    // BVC: Taken when V = 0
    expectBranchTaken("bvc");
    expectBranchNotTaken("bvc", "V");

    // BVS: Taken when V = 1
    expectBranchTaken("bvs", "V");
    expectBranchNotTaken("bvs");

    // BCC: Taken when C = 0
    expectBranchTaken("bcc");
    expectBranchNotTaken("bcc", "C");

    // BCS: Taken when C = 1
    expectBranchTaken("bcs", "C");
    expectBranchNotTaken("bcs");

    // BGE: Taken when N = V
    expectBranchTaken("bge");
    expectBranchTaken("bge", "NV");
    expectBranchNotTaken("bge", "N");
    expectBranchNotTaken("bge", "V");

    // BLT: Taken when N != V
    expectBranchTaken("blt", "N");
    expectBranchTaken("blt", "V");
    expectBranchNotTaken("blt");
    expectBranchNotTaken("blt", "NV");

    // BGT: Taken when N = V and Z = 0
    expectBranchTaken("bgt");
    expectBranchTaken("bgt", "NV");
    expectBranchNotTaken("bgt", "N");
    expectBranchNotTaken("bgt", "V");
    expectBranchNotTaken("bgt", "Z");
    expectBranchNotTaken("bgt", "NZ");
    expectBranchNotTaken("bgt", "VZ");
    expectBranchNotTaken("bgt", "NVZ");

    // BLE: Taken when N != V or Z = 1
    expectBranchTaken("ble", "N");
    expectBranchTaken("ble", "V");
    expectBranchTaken("ble", "Z");
    expectBranchTaken("ble", "ZN");
    expectBranchTaken("ble", "ZV");
    expectBranchTaken("ble", "ZNV");
    expectBranchNotTaken("ble");
    expectBranchNotTaken("ble", "NV");

    // BHI: Taken when C = 0 and Z = 0
    expectBranchTaken("bhi");
    expectBranchNotTaken("bhi", "C");
    expectBranchNotTaken("bhi", "Z");
    expectBranchNotTaken("bhi", "CZ");

    // BLS: Taken when C = 1 or Z = 1
    expectBranchTaken("bls", "C");
    expectBranchTaken("bls", "Z");
    expectBranchTaken("bls", "CZ");
    expectBranchNotTaken("bls");
  });

  test("flow control: should reach expected state after running", () => {
    // JMP
    expectRunState(["jmp R0"],    [], { r_R7: 2     }); // FIXME: Should not be allowed
    expectRunState(["jmp 32769"], [], { r_R7: 32769 });

    // SOB
    expectRunState(["mov #1, R1", "sob R1 4"], [], { r_R7: 6, r_R1: 0 });
    expectRunState(["mov #2, R2", "sob R2 4"], [], { r_R7: 2, r_R2: 1 });

    // JSR
    expectRunState([
      "mov #64000, R6",
      "mov #hABCD, R1",
      "jmp 8000",
      "org 8000\njsr R1, 16000"
    ], [], { r_R7: 16000, r_R1: 8004, r_R6: 63998, m_63998: 0xAB, m_63999: 0xCD });

    // RTS
    expectRunState([
      "mov #64000, R6",
      "mov #hABCD, -(R6)",
      "mov #32000, R2",
      "rts R2"
    ], [], { r_R7: 32000, r_R2: 0xABCD, r_R6: 64000, m_63998: 0xAB, m_63999: 0xCD });
  });

  test("flow control: should preserve flags", () => {
    expectRunState(["scc NZVC", "jmp 0"],     [], { ...flags("NZVC") });
    expectRunState(["scc NZVC", "sob R0, 0"], [], { ...flags("NZVC") });
    expectRunState(["scc NZVC", "jsr R0, 0"], [], { ...flags("NZVC") });
    expectRunState(["scc NZVC", "sob R0, 0"], [], { ...flags("NZVC") });

    expectRunState(["ccc NZVC", "jmp 0"],     [], { ...flags("") });
    expectRunState(["ccc NZVC", "sob R0, 0"], [], { ...flags("") });
    expectRunState(["ccc NZVC", "jsr R0, 0"], [], { ...flags("") });
    expectRunState(["ccc NZVC", "sob R0, 0"], [], { ...flags("") });
  });

  test("arithmetic (one operand): should reach expected result and flags after running", () => {
    expectRunState(["mov #hABCD, R1", "clr R1"], [], { r_R1: 0, ...flags("Z") });

    expectRunState([`mov #${0b1011001110001111}, R1`, "not R1"], [], { r_R1: 0b0100110001110000, ...flags("C")  });
    expectRunState([`mov #${0b0100110001110000}, R1`, "not R1"], [], { r_R1: 0b1011001110001111, ...flags("NC") });

    expectRunState(["mov #0, R1",     "inc R1"], [], { r_R1: 1,     ...flags("")   });
    expectRunState(["mov #32767, R1", "inc R1"], [], { r_R1: 32768, ...flags("NV") });
    expectRunState(["mov #65535, R1", "inc R1"], [], { r_R1: 0,     ...flags("ZC") });

    expectRunState(["mov #1, R1",     "dec R1"], [], { r_R1: 0,     ...flags("Z")  });
    expectRunState(["mov #0, R1",     "dec R1"], [], { r_R1: 65535, ...flags("NC") });
    expectRunState(["mov #32768, R1", "dec R1"], [], { r_R1: 32767, ...flags("V")  });

    expectRunState(["mov #0, R1",     "neg R1"], [], { r_R1: 0,     ...flags("Z")   });
    expectRunState(["mov #1, R1",     "neg R1"], [], { r_R1: 65535, ...flags("NC")  });
    expectRunState(["mov #32767, R1", "neg R1"], [], { r_R1: 32769, ...flags("NC")  });
    expectRunState(["mov #32768, R1", "neg R1"], [], { r_R1: 32768, ...flags("NVC") });
    expectRunState(["mov #32769, R1", "neg R1"], [], { r_R1: 32767, ...flags("C")   });
    expectRunState(["mov #65535, R1", "neg R1"], [], { r_R1: 1,     ...flags("C")   });

    expectRunState(["mov #0, R1",     "tst R1"], [], { r_R1: 0,     ...flags("Z") });
    expectRunState(["mov #32767, R1", "tst R1"], [], { r_R1: 32767, ...flags("")  });
    expectRunState(["mov #32768, R1", "tst R1"], [], { r_R1: 32768, ...flags("N") });

    expectRunState([`mov #${0b1001111111111001}, R1`, "ror R1"],                     [], { r_R1: 0b0100111111111100, ...flags("CV") });
    expectRunState([`mov #${0b1001111111111001}, R1`, "ror R1", "ror R1"],           [], { r_R1: 0b1010011111111110, ...flags("NV") });
    expectRunState([`mov #${0b1001111111111001}, R1`, "ror R1", "ror R1", "ror R1"], [], { r_R1: 0b0101001111111111, ...flags("")   });

    expectRunState([`mov #${0b1001111111111001}, R1`, "rol R1"],                     [], { r_R1: 0b0011111111110010, ...flags("CV") });
    expectRunState([`mov #${0b1001111111111001}, R1`, "rol R1", "rol R1"],           [], { r_R1: 0b0111111111100101, ...flags("")   });
    expectRunState([`mov #${0b1001111111111001}, R1`, "rol R1", "rol R1", "rol R1"], [], { r_R1: 0b1111111111001010, ...flags("NV") });

    expectRunState([`mov #${0b0001111111111000}, R1`, "asr R1"], [], { r_R1: 0b0000111111111100, ...flags("")   });
    expectRunState([`mov #${0b0001111111111001}, R1`, "asr R1"], [], { r_R1: 0b0000111111111100, ...flags("CV") });
    expectRunState([`mov #${0b1001111111111000}, R1`, "asr R1"], [], { r_R1: 0b1100111111111100, ...flags("NV") });
    expectRunState([`mov #${0b1001111111111001}, R1`, "asr R1"], [], { r_R1: 0b1100111111111100, ...flags("NC") });

    expectRunState([`mov #${0b0001111111111000}, R1`, "asl R1"], [], { r_R1: 0b0011111111110000, ...flags("")   });
    expectRunState([`mov #${0b0101111111111000}, R1`, "asl R1"], [], { r_R1: 0b1011111111110000, ...flags("NV") });
    expectRunState([`mov #${0b1001111111111000}, R1`, "asl R1"], [], { r_R1: 0b0011111111110000, ...flags("CV") });
    expectRunState([`mov #${0b1101111111111000}, R1`, "asl R1"], [], { r_R1: 0b1011111111110000, ...flags("NC") });

    expectRunState(["mov #0, R1",     "ccc C", "adc R1"], [], { r_R1: 0,     ...flags("Z")  });
    expectRunState(["mov #0, R1",     "scc C", "adc R1"], [], { r_R1: 1,     ...flags("")   });
    expectRunState(["mov #32767, R1", "ccc C", "adc R1"], [], { r_R1: 32767, ...flags("")   });
    expectRunState(["mov #32767, R1", "scc C", "adc R1"], [], { r_R1: 32768, ...flags("NV") });
    expectRunState(["mov #65535, R1", "ccc C", "adc R1"], [], { r_R1: 65535, ...flags("N")  });
    expectRunState(["mov #65535, R1", "scc C", "adc R1"], [], { r_R1: 0,     ...flags("ZC") });

    expectRunState(["mov #1, R1",     "ccc C", "sbc R1"], [], { r_R1: 1,     ...flags("C")  });
    expectRunState(["mov #1, R1",     "scc C", "sbc R1"], [], { r_R1: 0,     ...flags("ZC") });
    expectRunState(["mov #0, R1",     "ccc C", "sbc R1"], [], { r_R1: 0,     ...flags("ZC") });
    expectRunState(["mov #0, R1",     "scc C", "sbc R1"], [], { r_R1: 65535, ...flags("N")  });
    expectRunState(["mov #32768, R1", "ccc C", "sbc R1"], [], { r_R1: 32768, ...flags("NC") });
    expectRunState(["mov #32768, R1", "scc C", "sbc R1"], [], { r_R1: 32767, ...flags("VC") });
  });

  test("arithmetic (two operands): should reach expected result and flags after running", () => {
    expectRunState(["mov #0, R1"],          [], { r_R1: 0,      ...flags("Z")  }); // Preserves C = 0
    expectRunState(["scc c", "mov #0, R1"], [], { r_R1: 0,      ...flags("ZC") }); // Preserves C = 1
    expectRunState(["mov #hABCD, R1"],      [], { r_R1: 0xABCD, ...flags("N")  });
    expectRunState(["mov #1, R1"],          [], { r_R1: 1,      ...flags("")   });

    expectRunState(["add #h2000, #h2"],    [], { m_4: 0x20,          m_5: 0x02,          ...flags("")    }); // Positive result
    expectRunState(["add #hA0B0, #h1122"], [], { m_4: (0xA0 + 0x11), m_5: (0xB0 + 0x22), ...flags("N")   }); // Negative result
    expectRunState(["add #32767, #1"],     [], { m_4: 0x80,          m_5: 0x00,          ...flags("NV")  }); // Overflow to negative
    expectRunState(["add #-32768, #-1"],   [], { m_4: 0x7F,          m_5: 0xFF,          ...flags("VC")  }); // Overflow to positive
    expectRunState(["add #32768, #32768"], [], { m_4: 0,             m_5: 0,             ...flags("ZVC") }); // Overflow to zero

    expectRunState(["sub #h2, #h2000"],      [], { m_4: 0x1F,          m_5: 0xFE,          ...flags("")    }); // Positive result
    expectRunState(["sub #h1122, #hA0B0"],   [], { m_4: (0xA0 - 0x11), m_5: (0xB0 - 0x22), ...flags("N")   }); // Negative result
    expectRunState(["sub #-1, #32767"],      [], { m_4: 0x80,          m_5: 0x00,          ...flags("NVC") }); // Overflow to negative
    expectRunState(["sub #1, #-32768"],      [], { m_4: 0x7F,          m_5: 0xFF,          ...flags("V")   }); // Overflow to positive
    expectRunState(["sub #-32768, #-32768"], [], { m_4: 0,             m_5: 0,             ...flags("Z")   }); // Cancel out to zero

    expectRunState(["cmp #h2000, #h2"],      [], { m_4: 0x00, m_5: 0x02, ...flags("")    }); // Positive result
    expectRunState(["cmp #hA0B0, #h1122"],   [], { m_4: 0x11, m_5: 0x22, ...flags("N")   }); // Negative result
    expectRunState(["cmp #32767, #-1"],      [], { m_4: 0xFF, m_5: 0xFF, ...flags("NVC") }); // Positive overflow
    expectRunState(["cmp #-32768, #1"],      [], { m_4: 0x00, m_5: 0x01, ...flags("V")   }); // Negative overflow
    expectRunState(["cmp #-32768, #-32768"], [], { m_4: 0x80, m_5: 0x00, ...flags("Z")   }); // Cancel out to zero

    expectRunState(["and #hF00F, #hF0F0"],   [], { m_4: 0xF0, m_5: 0x00, ...flags("N")  });
    expectRunState(["scc VC", "and #0, #0"], [], { m_4: 0,    m_5: 0,    ...flags("ZC") }); // Clears V, preserves C = 1
    expectRunState(["scc V", "and #0, #0"],  [], { m_4: 0,    m_5: 0,    ...flags("Z")  }); // Clears V, preserves C = 0

    expectRunState(["or #hF00F, #hF0F0"],   [], { m_4: 0xF0, m_5: 0xFF, ...flags("N")  });
    expectRunState(["scc VC", "or #0, #0"], [], { m_4: 0,    m_5: 0,    ...flags("ZC") }); // Clears V, preserves C = 1
    expectRunState(["scc V", "or #0, #0"],  [], { m_4: 0,    m_5: 0,    ...flags("Z")  }); // Clears V, preserves C = 0
  });

});

describe("Cesar: Disassembler", () => {

  test("nop: should be an empty string", () => {
    expectInstructionStrings(["nop", "hlt"], ["", "HLT"]);
  });

  test("condition codes: should include correct flags", () => {
    expectInstructionStrings(["ccc", "ccc N", "ccc ZC", "ccc NZV", "ccc NZVC"], ["CCC", "CCC N", "CCC ZC", "CCC NZV", "CCC NZVC"]);
    expectInstructionStrings(["scc", "scc N", "scc ZC", "scc NZV", "scc NZVC"], ["SCC", "SCC N", "SCC ZC", "SCC NZV", "SCC NZVC"]);
  });

  test("conditional branching: should include offset", () => {
    expectInstructionStrings([ "br 127",  "br -128"], [ "BR 127", "",  "BR -128", ""]);
    expectInstructionStrings(["bne 127", "bne -128"], ["BNE 127", "", "BNE -128", ""]);
    expectInstructionStrings(["beq 127", "beq -128"], ["BEQ 127", "", "BEQ -128", ""]);
    expectInstructionStrings(["bpl 127", "bpl -128"], ["BPL 127", "", "BPL -128", ""]);
    expectInstructionStrings(["bmi 127", "bmi -128"], ["BMI 127", "", "BMI -128", ""]);
    expectInstructionStrings(["bvc 127", "bvc -128"], ["BVC 127", "", "BVC -128", ""]);
    expectInstructionStrings(["bvs 127", "bvs -128"], ["BVS 127", "", "BVS -128", ""]);
    expectInstructionStrings(["bcc 127", "bcc -128"], ["BCC 127", "", "BCC -128", ""]);
    expectInstructionStrings(["bcs 127", "bcs -128"], ["BCS 127", "", "BCS -128", ""]);
    expectInstructionStrings(["bge 127", "bge -128"], ["BGE 127", "", "BGE -128", ""]);
    expectInstructionStrings(["blt 127", "blt -128"], ["BLT 127", "", "BLT -128", ""]);
    expectInstructionStrings(["bgt 127", "bgt -128"], ["BGT 127", "", "BGT -128", ""]);
    expectInstructionStrings(["ble 127", "ble -128"], ["BLE 127", "", "BLE -128", ""]);
    expectInstructionStrings(["bhi 127", "bhi -128"], ["BHI 127", "", "BHI -128", ""]);
    expectInstructionStrings(["bls 127", "bls -128"], ["BLS 127", "", "BLS -128", ""]);
  });

  test("flow control: should include correct arguments in one string", () => {
    expectInstructionStrings(["jmp (r0)", "jmp (r4)+", "jmp (-(r7))"], ["JMP (R0)", "", "JMP (R4)+", "", "JMP (-(R7))", ""]);
    expectInstructionStrings(["sob r0 -128", "sob r4 0", "sob r7 127"], ["SOB R0, -128", "", "SOB R4, 0", "", "SOB R7, 127", ""]);
    expectInstructionStrings(["jsr r0 (r7)", "jsr r4 (r4)+", "jsr r7 (-(r0))"], ["JSR R0, (R7)", "", "JSR R4, (R4)+", "", "JSR R7, (-(R0))", ""]);
    expectInstructionStrings(["rts r0", "rts r4", "rts r7"], ["RTS R0", "RTS R4", "RTS R7"]);
  });

  test("arithmetic (one operand): should include correct arguments in one string", () => {
    expectInstructionStrings(["clr r0", "clr (r4)+", "clr (-(r7))"], ["CLR R0", "", "CLR (R4)+", "", "CLR (-(R7))", ""]);
    expectInstructionStrings(["not r0", "not (r4)+", "not (-(r7))"], ["NOT R0", "", "NOT (R4)+", "", "NOT (-(R7))", ""]);
    expectInstructionStrings(["inc r0", "inc (r4)+", "inc (-(r7))"], ["INC R0", "", "INC (R4)+", "", "INC (-(R7))", ""]);
    expectInstructionStrings(["dec r0", "dec (r4)+", "dec (-(r7))"], ["DEC R0", "", "DEC (R4)+", "", "DEC (-(R7))", ""]);
    expectInstructionStrings(["neg r0", "neg (r4)+", "neg (-(r7))"], ["NEG R0", "", "NEG (R4)+", "", "NEG (-(R7))", ""]);
    expectInstructionStrings(["tst r0", "tst (r4)+", "tst (-(r7))"], ["TST R0", "", "TST (R4)+", "", "TST (-(R7))", ""]);
    expectInstructionStrings(["ror r0", "ror (r4)+", "ror (-(r7))"], ["ROR R0", "", "ROR (R4)+", "", "ROR (-(R7))", ""]);
    expectInstructionStrings(["rol r0", "rol (r4)+", "rol (-(r7))"], ["ROL R0", "", "ROL (R4)+", "", "ROL (-(R7))", ""]);
    expectInstructionStrings(["asr r0", "asr (r4)+", "asr (-(r7))"], ["ASR R0", "", "ASR (R4)+", "", "ASR (-(R7))", ""]);
    expectInstructionStrings(["asl r0", "asl (r4)+", "asl (-(r7))"], ["ASL R0", "", "ASL (R4)+", "", "ASL (-(R7))", ""]);
    expectInstructionStrings(["adc r0", "adc (r4)+", "adc (-(r7))"], ["ADC R0", "", "ADC (R4)+", "", "ADC (-(R7))", ""]);
    expectInstructionStrings(["sbc r0", "sbc (r4)+", "sbc (-(r7))"], ["SBC R0", "", "SBC (R4)+", "", "SBC (-(R7))", ""]);
  });

  test("arithmetic (two operands): should include correct arguments in one string", () => {
    expectInstructionStrings(["mov r0 (-(r7))", "mov (r4)+ (r4)+", "mov (-(r7)) r0"], ["MOV R0, (-(R7))", "", "MOV (R4)+, (R4)+", "", "MOV (-(R7)), R0", ""]);
    expectInstructionStrings(["add r0 (-(r7))", "add (r4)+ (r4)+", "add (-(r7)) r0"], ["ADD R0, (-(R7))", "", "ADD (R4)+, (R4)+", "", "ADD (-(R7)), R0", ""]);
    expectInstructionStrings(["sub r0 (-(r7))", "sub (r4)+ (r4)+", "sub (-(r7)) r0"], ["SUB R0, (-(R7))", "", "SUB (R4)+, (R4)+", "", "SUB (-(R7)), R0", ""]);
    expectInstructionStrings(["cmp r0 (-(r7))", "cmp (r4)+ (r4)+", "cmp (-(r7)) r0"], ["CMP R0, (-(R7))", "", "CMP (R4)+, (R4)+", "", "CMP (-(R7)), R0", ""]);
    expectInstructionStrings(["and r0 (-(r7))", "and (r4)+ (r4)+", "and (-(r7)) r0"], ["AND R0, (-(R7))", "", "AND (R4)+, (R4)+", "", "AND (-(R7)), R0", ""]);
    expectInstructionStrings([ "or r0 (-(r7))",  "or (r4)+ (r4)+",  "or (-(r7)) r0"], [ "OR R0, (-(R7))", "",  "OR (R4)+, (R4)+", "",  "OR (-(R7)), R0", ""]);
  });

  test("addressing modes: should interpret corretly all non-offset modes", () => {
    // JMP
    expectInstructionStrings(
      ["dab 64, 0", "jmp (r1)", "jmp (r2)+", "jmp -(r3)", "jmp ((r4)+)", "jmp (-(r5))"],
      ["JMP R0", "", "JMP (R1)", "", "JMP (R2)+", "", "JMP -(R3)", "", "JMP ((R4)+)", "", "JMP (-(R5))", ""]
    );

    // JSR
    expectInstructionStrings(
      ["dab 103, 0", "jsr r7 (r1)", "jsr r7 (r2)+", "jsr r7 -(r3)", "jsr r7 ((r4)+)", "jsr r7 (-(r5))"],
      ["JSR R7, R0", "", "JSR R7, (R1)", "", "JSR R7, (R2)+", "", "JSR R7, -(R3)", "", "JSR R7, ((R4)+)", "", "JSR R7, (-(R5))", ""]
    );

    // Arithmetic (one operand)
    expectInstructionStrings(
      ["clr r1", "clr (r2)", "clr (r3)+", "clr -(r4)", "clr ((r5)+)", "clr (-(r6))"],
      ["CLR R1", "", "CLR (R2)", "", "CLR (R3)+", "", "CLR -(R4)", "", "CLR ((R5)+)", "", "CLR (-(R6))", ""]
    );

    // Arithmetic (two operands)
    expectInstructionStrings(
      ["mov r0 (-(r5))", "mov (r1) ((r4)+)", "mov (r2)+ -(r3)", "mov -(r3) (r2)+", "mov ((r4)+) (r1)", "mov (-(r5)) r0"],
      ["MOV R0, (-(R5))", "", "MOV (R1), ((R4)+)", "", "MOV (R2)+, -(R3)", "", "MOV -(R3), (R2)+", "", "MOV ((R4)+), (R1)", "", "MOV (-(R5)), R0", ""]
    );
  });

  test("addressing modes: should interpret correctly all offset modes", () => {
    // JMP
    expectInstructionStrings(
      ["jmp 32767(r0)", "jmp -1(r1)", "jmp (32767(r2))", "jmp (-1(r3))"],
      ["JMP 32767(R0)", "", "", "", "JMP 65535(R1)", "", "", "", "JMP (32767(R2))", "", "", "", "JMP (65535(R3))", "", "", ""]
    );

    // JSR
    expectInstructionStrings(
      ["jsr r7 32767(r0)", "jsr r7 -1(r1)", "jsr r7 (32767(r2))", "jsr r7 (-1(r3))"],
      ["JSR R7, 32767(R0)", "", "", "", "JSR R7, 65535(R1)", "", "", "", "JSR R7, (32767(R2))", "", "", "", "JSR R7, (65535(R3))", "", "", ""]
    );

    // Arithmetic (one operand)
    expectInstructionStrings(
      ["clr 32767(r0)", "clr -1(r1)", "clr (32767(r2))", "clr (-1(r3))"],
      ["CLR 32767(R0)", "", "", "", "CLR 65535(R1)", "", "", "", "CLR (32767(R2))", "", "", "", "CLR (65535(R3))", "", "", ""]
    );

    // Arithmetic (two operands)
    expectInstructionStrings([
      "mov r0 -1(r1)", "mov r0 (-1(r1))", // Offset on 2nd argument
      "mov -1(r2) r3", "mov (-1(r2)) r3", // Offset on 1st argument
      "mov -1(r4) (32767(r5))", "mov (32767(r4)) -1(r5)" // Offset on both arguments
    ], [
      "MOV R0, 65535(R1)", "", "", "", "MOV R0, (65535(R1))", "", "", "",
      "MOV 65535(R2), R3", "", "", "", "MOV (65535(R2)), R3", "", "", "",
      "MOV 65535(R4), (32767(R5))", "", "", "", "", "", "MOV (32767(R4)), 65535(R5)", "", "", "", "", ""
    ]);
  });

  test("addressing modes: should properly handle R7 addressing modes", () => {
    // JMP
    expectInstructionStrings(
      ["jmp #60000", "jmp 60001", "jmp 60002(r7)", "jmp (60003(r7))"],
      ["JMP #60000", "", "", "", "JMP 60001", "", "", "", "JMP 60002(R7)", "", "", "", "JMP (60003(R7))", "", "", ""]
    );

    // JSR
    expectInstructionStrings(
      ["jsr r0 #60000", "jsr r0 60001", "jsr r0 60002(r7)", "jsr r0 (60003(r7))"],
      ["JSR R0, #60000", "", "", "", "JSR R0, 60001", "", "", "", "JSR R0, 60002(R7)", "", "", "", "JSR R0, (60003(R7))", "", "", ""]
    );

    // Arithmetic (one operand)
    expectInstructionStrings(
      ["clr #60000", "clr 60001", "clr 60002(r7)", "clr (60003(r7))"],
      ["CLR #60000", "", "", "", "CLR 60001", "", "", "", "CLR 60002(R7)", "", "", "", "CLR (60003(R7))", "", "", ""]
    );

    // Arithmetic (two operands)
    expectInstructionStrings([
      "mov #60000 r0", "mov r0 #60001", "mov #60002 #60003", // Immediate on 1st, 2nd and both arguments
      "mov 60004 r0", "mov r0 60005", "mov 60006 60007",  // Direct on 1st, 2nd and both arguments
      "mov 60008(r7) r0", "mov r0 60009(r7)", "mov 60010(r7) 60011(r7)", // Indexed by R7 (direct) on 1st, 2nd and both arguments
      "mov (60012(r7)) r0", "mov r0 (60013(r7))", "mov (60014(r7)) (60015(r7))", // Indexed by R7 (indirect) on 1st, 2nd and both arguments
      "mov #60016 60017(r7)", "mov (60018(r7)) 60019" // Mixed R7 modes
    ], [
      "MOV #60000, R0", "", "", "", "MOV R0, #60001", "", "", "", "MOV #60002, #60003", "", "", "", "", "",
      "MOV 60004, R0", "", "", "", "MOV R0, 60005", "", "", "", "MOV 60006, 60007", "", "", "", "", "",
      "MOV 60008(R7), R0", "", "", "", "MOV R0, 60009(R7)", "", "", "", "MOV 60010(R7), 60011(R7)", "", "", "", "", "",
      "MOV (60012(R7)), R0", "", "", "", "MOV R0, (60013(R7))", "", "", "", "MOV (60014(R7)), (60015(R7))", "", "", "", "", "",
      "MOV #60016, 60017(R7)", "", "", "", "", "", "MOV (60018(R7)), 60019", "", "", "", "", ""
    ]);
  });

});
