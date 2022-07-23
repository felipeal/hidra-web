import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/AssemblerError";
import { Pericles } from "../core/machines/Pericles";
import {
  expectNextOperandAddressAndStep, makeFunction_expectBuildError, makeFunction_expectBuildSuccess, makeFunction_expectInstructionStrings,
  makeFunction_expectRunState
} from "./utils/MachineTestFunctions";

const machine = new Pericles();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectBuildError = makeFunction_expectBuildError(assembler);
const expectRunState = makeFunction_expectRunState(assembler, machine);
const expectInstructionStrings = makeFunction_expectInstructionStrings(assembler, machine);

describe("Pericles: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0x00]);
    expectBuildSuccess("str A 2049", [0x10, 1, 8]);
    expectBuildSuccess("ldr A 2049", [0x20, 1, 8]);
    expectBuildSuccess("add A 2049", [0x30, 1, 8]);
    expectBuildSuccess("or A 2049", [0x40, 1, 8]);
    expectBuildSuccess("and A 2049", [0x50, 1, 8]);
    expectBuildSuccess("not A", [0x60]);
    expectBuildSuccess("sub A 2049", [0x70, 1, 8]);
    expectBuildSuccess("jmp 2049", [0x80, 1, 8]);
    expectBuildSuccess("jn 2049", [0x90, 1, 8]);
    expectBuildSuccess("jz 2049", [0xA0, 1, 8]);
    expectBuildSuccess("jc 2049", [0xB0, 1, 8]);
    expectBuildSuccess("jsr 2049", [0xC0, 1, 8]);
    expectBuildSuccess("neg A", [0xD0]);
    expectBuildSuccess("shr A", [0xE0]);
    expectBuildSuccess("hlt", [0xF0]);
  });

  test("instructions: should ignore whitespace when calculating the number of bytes", () => {
    expectBuildSuccess(["str  A  2049,I  ; Comment", "not A"], [0x11, 1, 8, 0x60]);
  });

  test("addressing modes: should build correctly with variable number of bytes", () => {
    expectBuildSuccess(["str A 2049,I", "str A #128", "str A 2049,X"], [0x11, 1, 8, 0x12, 128, 0x13, 1, 8]);
    expectBuildSuccess(["ldr A 2049,I", "ldr A #128", "ldr A 2049,X"], [0x21, 1, 8, 0x22, 128, 0x23, 1, 8]);
    expectBuildSuccess(["add A 2049,I", "add A #128", "add A 2049,X"], [0x31, 1, 8, 0x32, 128, 0x33, 1, 8]);
    expectBuildSuccess(["or A 2049,I", "or A #128", "or A 2049,X"], [0x41, 1, 8, 0x42, 128, 0x43, 1, 8]);
    expectBuildSuccess(["and A 2049,I", "and A #128", "and A 2049,X"], [0x51, 1, 8, 0x52, 128, 0x53, 1, 8]);
    expectBuildSuccess(["sub A 2049,I", "sub A #128", "sub A 2049,X"], [0x71, 1, 8, 0x72, 128, 0x73, 1, 8]);
    expectBuildSuccess(["jmp 2049,I", "jmp #128", "jmp 2049,X"], [0x81, 1, 8, 0x82, 128, 0x83, 1, 8]);
    expectBuildSuccess(["jn 2049,I", "jn #128", "jn 2049,X"], [0x91, 1, 8, 0x92, 128, 0x93, 1, 8]);
    expectBuildSuccess(["jz 2049,I", "jz #128", "jz 2049,X"], [0xA1, 1, 8, 0xA2, 128, 0xA3, 1, 8]);
    expectBuildSuccess(["jc 2049,I", "jc #128", "jc 2049,X"], [0xB1, 1, 8, 0xB2, 128, 0xB3, 1, 8]);
    expectBuildSuccess(["jsr 2049,I", "jsr #128", "jsr 2049,X"], [0xC1, 1, 8, 0xC2, 128, 0xC3, 1, 8]);
  });

  test("registers: should build correct binary", () => {
    expectBuildSuccess("str A 128", [0x10, 128]);
    expectBuildSuccess("str B 128", [0x14, 128]);
    expectBuildSuccess("str X 128", [0x18, 128]);
    expectBuildError("str PC 128", AssemblerErrorCode.INVALID_ARGUMENT);
  });

  test("endianness: should be little endian", () => {
    expectBuildSuccess("dw h1020", [0x20, 0x10]);
  });

  test("build: should validate memory overlap", () => {
    expectBuildSuccess("ADD A #1\nORG 2\nADD A #2", [0x32, 1, 0x32, 2]); // No overlap for immediate
    expectBuildError("ORG 2\nADD A 0\nORG 0\nADD A 0", AssemblerErrorCode.MEMORY_OVERLAP, 4); // Overlap on third byte only
  });

  test("build: should validate memory exceeded", () => {
    expectBuildSuccess("ORG 4093\nADD A 0", [0]); // Instruction ends inside memory
    expectBuildSuccess("ORG 4094\nADD A #0", [0]); // Instruction with immediate address ends inside memory
    expectBuildError("ORG 4094\nDAW 1, 2", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Word starts outside memory
    expectBuildError("ORG 4093\nDAW 1, 2", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Word ends outside memory
    expectBuildError("ORG 4094\nADD A 0", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Instruction ends outside memory
    expectBuildError("ORG 4095\nADD A #0", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Instruction ends outside memory
  });

  test("reserved keywords: should build correct list", () => {
    expect(assembler["buildReservedKeywordsList"]()).toEqual([
      "org", "db", "dw", "dab", "daw",
      "nop", "str", "ldr", "add", "or", "and", "not", "sub",
      "jmp", "jn", "jz", "jc", "jsr", "neg", "shr", "hlt",
      "a", "b", "x",
      "i", "x"
    ]);
  });

});

describe("Pericles: Run", () => {

  const values = ["ORG 1024", "V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const hexValues = ["ORG 1024", "VhF0: DB hF0", "Vh88: DB h88"];
  const binValues = ["ORG 1024", "Vb10000001: DB h81"];
  const addresses = ["ORG 1000", "A1000V2000: DW 2000", "A1002V21: DB 21", "ORG 2000", "A2000V30: DB 30"];

  test("instructions: should reach expected state after running", () => {

    expectRunState(["nop"], [], { r_A: 0, r_PC: 1 });

    // Load/Store
    expectRunState(["ldr A V255"], values, { r_A: 255, r_PC: 3 });
    expectRunState(["ldr A V255", "str A 2000"], values, { r_A: 0XFF, r_PC: 6, m_2000: 0xFF });

    // Arithmetic/Logic
    expectRunState(["ldr A V255", "add A V255"], values, { r_A: 254, r_PC: 6 });
    expectRunState(["ldr A VhF0", "or A Vh88"], hexValues, { r_A: 0xF8, r_PC: 6 });
    expectRunState(["ldr A VhF0", "and A Vh88"], hexValues, { r_A: 0x80, r_PC: 6 });
    expectRunState(["ldr A VhF0", "not A"], hexValues, { r_A: 0x0F, r_PC: 4 });
    expectRunState(["ldr A V128", "sub A V255"], values, { r_A: 129, r_PC: 6 });

    // Jumps
    expectRunState(["jmp 16"], [], { r_A: 0, r_PC: 16 });
    expectRunState(["ldr A V127", "jn 2000"], values, { r_A: 127, r_PC: 6, f_N: false });
    expectRunState(["ldr A V128", "jn 2000"], values, { r_A: 128, r_PC: 2000, f_N: true });
    expectRunState(["ldr A V255", "jz 2000"], values, { r_A: 255, r_PC: 6, f_Z: false });
    expectRunState(["ldr A V0", "jz 2000"], values, { r_A: 0, r_PC: 2000, f_Z: true });
    expectRunState(["sub A V255", "jc 2000"], values, { r_A: 1, r_PC: 6, f_C: false });
    expectRunState(["sub A V0", "jc 2000"], values, { r_A: 0, r_PC: 2000, f_C: true });
    expectRunState(["nop", "jsr 2000"], [], { r_PC: 2001, m_2000: 4 });

    // Logic
    expectRunState(["ldr A V0", "neg A"], values, { r_A: 0, r_PC: 4 });
    expectRunState(["ldr A V127", "neg A"], values, { r_A: 129, r_PC: 4 });
    expectRunState(["ldr A V128", "neg A"], values, { r_A: 128, r_PC: 4 });
    expectRunState(["ldr A V255", "neg A"], values, { r_A: 1, r_PC: 4 });
    expectRunState(["ldr A Vb10000001", "shr A"], binValues, { r_PC: 4, r_A: 0b01000000, f_C: true });
    expectRunState(["ldr A Vb10000001", "shr A", "shr A"], binValues, { r_PC: 5, r_A: 0b00100000, f_C: false });

    // Halt
    expectRunState(["nop", "nop"], [], { isRunning: true, r_PC: 2 });
    expectRunState(["hlt", "nop"], [], { isRunning: false, r_PC: 1 });
  });

  test("flags: N/Z should match last updated register", () => {
    // Load
    expectRunState(["ldr a V0"], values, { f_N: false, f_Z: true });
    expectRunState(["ldr a V127"], values, { f_N: false, f_Z: false });
    expectRunState(["ldr a V128"], values, { f_N: true, f_Z: false });

    // Load with different registers
    expectRunState(["ldr a V0", "ldr b V128"], values, { f_N: true, f_Z: false });
    expectRunState(["ldr b V0", "ldr x V128"], values, { f_N: true, f_Z: false });
    expectRunState(["ldr x V0", "ldr a V128"], values, { f_N: true, f_Z: false });

    // Arithmetic/Logic with different registers
    expectRunState(["ldr a V255", "add b V0"], values, { f_N: false, f_Z: true });
    expectRunState(["ldr a V255", "or b V0"], values, { f_N: false, f_Z: true });
    expectRunState(["ldr a V255", "and b V0"], values, { f_N: false, f_Z: true });
    expectRunState(["ldr a V0", "not b"], values, { f_N: true, f_Z: false });
  });

  test("flags: C should match last carry operation", () => {
    // Arithmetic/Logic
    expectRunState(["ldr a V128", "add a V127"], values, { r_A: 255, f_C: false });
    expectRunState(["ldr a V128", "add a V128"], values, { r_A: 0, f_C: true });
    expectRunState(["ldr a V127", "sub a V127"], values, { r_A: 0, f_C: true });
    expectRunState(["ldr a V127", "sub a V128"], values, { r_A: 255, f_C: false });
    expectRunState(["ldr a V0", "neg a"], values, { r_A: 0, f_C: true });
    expectRunState(["ldr a V127", "neg a"], values, { r_A: 129, f_C: false });
    expectRunState(["ldr a V127", "neg a", "neg a"], values, { r_A: 127, f_C: false });
    expectRunState(["ldr a V128", "neg a"], values, { r_A: 128, f_C: false });
    expectRunState(["ldr a V255", "neg a"], values, { r_A: 1, f_C: false });
    expectRunState(["ldr a V255", "neg a", "neg a"], values, { r_A: 255, f_C: false });
    expectRunState(["ldr A V127", "shr A"], values, { f_C: true });
    expectRunState(["ldr A V128", "shr A"], values, { f_C: false });

    // Arithmetic/Logic with different registers
    expectRunState(["ldr a V255", "add a V255", "add b V0"], values, { f_C: false }); // Updates carry
    expectRunState(["ldr a V255", "add a V255", "or b V0"], values, { f_C: true });
    expectRunState(["ldr a V255", "add a V255", "and b V0"], values, { f_C: true });
    expectRunState(["ldr a V255", "add a V255", "not b"], values, { f_C: true });
    expectRunState(["ldr a V255", "add a V255", "sub b V127"], values, { f_C: false }); // Updates carry
    expectRunState(["ldr a V255", "add a V0", "neg b"], values, { f_C: true }); // Updates carry
    expectRunState(["ldr a V255", "add a V255", "shr b"], values, { f_C: false }); // Updates carry
  });

  test("addressing modes: should map to correct address/value", () => {
    // Load
    expectRunState(["ldr A A2000V30"], addresses, { r_A: 30 });
    expectRunState(["ldr A A1000V2000,I"], addresses, { r_A: 30 });
    expectRunState(["ldr A #40"], [], { r_A: 40 });
    expectRunState(["ldr X #2", "ldr A A1000V2000,X"], addresses, { r_A: 21 });

    // Store
    expectRunState(["ldr A #16", "str A 1000"], [], { m_1000: 16 });
    expectRunState(["ldr A #16", "str A A1000V2000,I"], addresses, { m_2000: 16 });
    expectRunState(["ldr A #16", "str A #32"], [], { r_A: 16, m_3: 16, m_32: 0 }); // Value 32 is unused
    expectRunState(["ldr A #16", "ldr X #2", "str A A1000V2000,X"], addresses, { m_1002: 16 });

    // Indexing by X should be done using two's complement
    expectRunState(["ldr A #32", "ldr X #255", "str A 1000,X"], [], { m_1255: 0, m_999: 32 });

    // Arithmetic
    expectRunState(["add A A2000V30"], addresses, { r_A: 30 });
    expectRunState(["add A A1000V2000,I"], addresses, { r_A: 30 });
    expectRunState(["add A #40"], [], { r_A: 40 });
    expectRunState(["ldr X #2", "add A A1000V2000,X"], addresses, { r_A: 21 });

    // Jumps
    expectRunState(["jmp 1000"], [], { r_PC: 1000 });
    expectRunState(["jmp A1000V2000,I"], addresses, { r_PC: 2000 });
    expectRunState(["jmp #40"], [], { r_PC: 2 }); // Ignored
    expectRunState(["ldr X #-2", "jmp 2000,X"], [], { r_PC: 1998 });
  });

  test("registers: should work independently", () => {
    expectRunState(["ldr a #10", "ldr b #20", "ldr x #30"], [], { r_A: 10, r_B: 20, r_X: 30 });
  });

  test("registers: should not expose a 4th register on bit pattern ....11..", () => {
    // Note: Undefined behavior (see note on Ramses). Hidra will always return 0.
    expectRunState([
      "dab 46, 10", // LDR ? #10
      "dab 28, 0" // STR ? 0
    ], [], { m_0: 0 });
  });

  test("registers: should overflow at 256 (A, B, X) or 4096 (PC)", () => {
    expectRunState(["ldr a V128", "add a V128"], values, { r_A: 0, f_N: false, f_Z: true });
    expectRunState(["ldr b V128", "add b V128"], values, { r_A: 0, f_N: false, f_Z: true });
    expectRunState(["ldr x V128", "add x V128"], values, { r_A: 0, f_N: false, f_Z: true });
    expectRunState(["jmp 4095", ""], [], { r_PC: 0 });
  });

});

describe("Pericles: Disassembler", () => {

  test("nop: should be an empty string", () => {
    expectInstructionStrings(["nop", "hlt"], ["", "HLT"]);
  });

  test("instructions: should include correct arguments in one string", () => {
    expectInstructionStrings(["str A 2049", "hlt"], ["STR A 2049", "", "", "HLT"]);
    expectInstructionStrings(["ldr A 2049", "hlt"], ["LDR A 2049", "", "", "HLT"]);
    expectInstructionStrings(["add A 2049", "hlt"], ["ADD A 2049", "", "", "HLT"]);
    expectInstructionStrings(["or A 2049", "hlt"], ["OR A 2049", "", "", "HLT"]);
    expectInstructionStrings(["and A 2049", "hlt"], ["AND A 2049", "", "", "HLT"]);
    expectInstructionStrings(["not A", "hlt"], ["NOT A", "HLT"]);
    expectInstructionStrings(["sub A 2049", "hlt"], ["SUB A 2049", "", "", "HLT"]);
    expectInstructionStrings(["jmp 2049", "hlt"], ["JMP 2049", "", "", "HLT"]);
    expectInstructionStrings(["jn 2049", "hlt"], ["JN 2049", "", "", "HLT"]);
    expectInstructionStrings(["jz 2049", "hlt"], ["JZ 2049", "", "", "HLT"]);
    expectInstructionStrings(["jc 2049", "hlt"], ["JC 2049", "", "", "HLT"]);
    expectInstructionStrings(["jsr 2049", "hlt"], ["JSR 2049", "", "", "HLT"]);
    expectInstructionStrings(["neg A", "hlt"], ["NEG A", "HLT"]);
    expectInstructionStrings(["shr A", "hlt"], ["SHR A", "HLT"]);
    expectInstructionStrings(["hlt", "hlt"], ["HLT", "HLT"]);
  });

  test("addressing modes: should be interpreted correctly", () => {
    expectInstructionStrings(["jmp 2049", "hlt"], ["JMP 2049", "", "", "HLT"]);
    expectInstructionStrings(["jmp 2049,I", "hlt"], ["JMP 2049,I", "", "", "HLT"]);
    expectInstructionStrings(["jmp #128", "hlt"], ["JMP #128", "", "HLT"]);
    expectInstructionStrings(["jmp 2049,X", "hlt"], ["JMP 2049,X", "", "", "HLT"]);
    expectInstructionStrings(["add a 2049", "hlt"], ["ADD A 2049", "", "", "HLT"]);
    expectInstructionStrings(["add a 2049,I", "hlt"], ["ADD A 2049,I", "", "", "HLT"]);
    expectInstructionStrings(["add a #128", "hlt"], ["ADD A #128", "", "HLT"]);
    expectInstructionStrings(["add a 2049,X", "hlt"], ["ADD A 2049,X", "", "", "HLT"]);
  });

  test("registers: should be interpreted correctly", () => {
    expectInstructionStrings(["add a 2049", "hlt"], ["ADD A 2049", "", "", "HLT"]);
    expectInstructionStrings(["add b 2049", "hlt"], ["ADD B 2049", "", "", "HLT"]);
    expectInstructionStrings(["add x 2049", "hlt"], ["ADD X 2049", "", "", "HLT"]);
  });

  test("invalid register: should replace with question mark", () => {
    expectInstructionStrings([
      "dab 46, 10", // LDR ? #10
      "dab 28, 0" // STR ? 0
    ], ["LDR ? #10", "", "STR ? 0"]);
  });

  test("operands: should be mapped correctly for highlighting", () => {
    expect(assembler.build(["add a 1000", "add a 2000,I", "ldr X #-128", "add a 4000,X", "nop", "org 2000", "dw 2500"].join("\n"))).toEqual([]);
    expectNextOperandAddressAndStep(machine, 1000); // Direct
    expectNextOperandAddressAndStep(machine, 2500, 2000, 2001); // Indirect
    expectNextOperandAddressAndStep(machine, 7); // Immediate
    expectNextOperandAddressAndStep(machine, 4000 - 128); // Indexed by X
    expectNextOperandAddressAndStep(machine, -1); // NOP
  });

});
