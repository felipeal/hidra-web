import { } from "./utils/CustomExtends";
import { makeFunction_expectBuildError, makeFunction_expectBuildSuccess } from "./utils/MachineTestFunctions";
import { Cesar } from "../core/machines/Cesar";
import { CesarAssembler } from "../core/CesarAssembler";
import { AssemblerErrorCode } from "../core/AssemblerError";

const machine = new Cesar();
const assembler = new CesarAssembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectBuildError = makeFunction_expectBuildError(assembler);

function toBytes(word: number): number[] {
  return [(word & 0xFF00) >> 8, word & 0xFF];
}

describe("Cesar: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0b00000000]);

    expectBuildSuccess("ccc nz", [0b00011100]);
    expectBuildSuccess("scc vc", [0b00100011]);

    // Conditional branching
    expectBuildSuccess("br 127", [0b00110000, 127]);
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

    // Jumps / Subroutines
    expectBuildSuccess("jmp (r0)", [0b01000000, 0x20]);
    expectBuildSuccess("sob r0, 127", [0b01010000, 127]);
    expectBuildSuccess("jsr r0, (r0)", [0b01100000, 0x20]);
    expectBuildSuccess("jsr r0, (r0)", [0b01100000, 0x20]);
    expectBuildSuccess("rts r0", [0b01110000]);

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
    expectBuildSuccess("or r0, r0", [0b11100000]);

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
    expectBuildError(["ccc n, f"], AssemblerErrorCode.INVALID_ARGUMENT); // Invalid flag
    expectBuildError(["ccc n, n"], AssemblerErrorCode.INVALID_ARGUMENT); // Duplicate flag
    expectBuildError(["ccc n, zv"], AssemblerErrorCode.INVALID_ARGUMENT); // Concatenating when using separators
    expectBuildError(["ccc n,, z"], AssemblerErrorCode.INVALID_ARGUMENT); // Multiple commas
  });

  test("PC label offset: should build correct binary", () => {
    const label = ["org 1025", "Label: DW"];

    // R0..R6: Absolute label address used (1025)
    expectBuildSuccess(["jmp Label(r0)", "jmp Label(r0)", ...label], [0x40, 0x18, ...toBytes(1025), 0x40, 0x18, ...toBytes(1025)]);
    expectBuildSuccess(["jmp (Label(r6))", "jmp (Label(r6))", ...label], [0x40, 0x3E, ...toBytes(1025), 0x40, 0x3E, ...toBytes(1025)]);

    // R7: Relative label address used (1021 and 1017)
    expectBuildSuccess(["jmp Label(r7)", "jmp Label(r7)", ...label], [0x40, 0x1F, ...toBytes(1021), 0x40, 0x1F, ...toBytes(1017)]);
    expectBuildSuccess(["jmp (Label(r7))", "jmp (Label(r7))", ...label], [0x40, 0x3F, ...toBytes(1021), 0x40, 0x3F, ...toBytes(1017)]);

    // MOV: mixed scenarios
    // FIXME: Does not match Daedalus
    // expectBuildSuccess(["mov Label(r6), Label(r7)", ...label], [0x97, 0x9F, ...toBytes(1025), ...toBytes(1021)]);
    // expectBuildSuccess(["mov Label(r6), (Label(r7))", ...label], [0x97, 0xBF, ...toBytes(1025), ...toBytes(1021)]);
    // expectBuildSuccess(["mov Label(r7), Label(r6)", ...label], [0x97, 0xDE, ...toBytes(1023), ...toBytes(1025)]);
    // expectBuildSuccess(["mov (Label(r7)), Label(r6)", ...label], [0x9F, 0xDE, ...toBytes(1023), ...toBytes(1025)]);
    // expectBuildSuccess(["mov Label(r7), (Label(r7))", ...label], [0x97, 0xFF, ...toBytes(1023), ...toBytes(1021)]);
    // expectBuildSuccess(["mov (Label(r7)), Label(r7)", ...label], [0x9F, 0xDF, ...toBytes(1023), ...toBytes(1021)]);
  });

  // TODO: Test offsets with branch and SOB

  // TODO: Test direct and immediate addressing modes

  // TODO: Test "Zero: DW Zero-32769"

  // TODO: Disallow mode 0 for jumps

  // TODO: Test "Zero: DB Zero" -> ponteiro de 8 bits -- applies to Pericles

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

// TODO: "Cesar: Run"
