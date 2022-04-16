import { } from "./utils/CustomExtends";
import { Assembler } from "../core/Assembler";
import { Neander } from "../core/machines/Neander";
import { makeFunction_expectBuildSuccess, makeFunction_expectInstructionStrings, makeFunction_expectRunState } from "./utils/MachineTestFunctions";

const machine = new Neander();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectRunState = makeFunction_expectRunState(assembler, machine);
const expectInstructionStrings = makeFunction_expectInstructionStrings(assembler, machine);

describe("Neander: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0]);
    expectBuildSuccess("sta 128", [16, 128]);
    expectBuildSuccess("lda 128", [32, 128]);
    expectBuildSuccess("add 128", [48, 128]);
    expectBuildSuccess("or 128", [64, 128]);
    expectBuildSuccess("and 128", [80, 128]);
    expectBuildSuccess("not", [96]);
    expectBuildSuccess("jmp 128", [128, 128]);
    expectBuildSuccess("jn 128", [144, 128]);
    expectBuildSuccess("jz 128", [160, 128]);
    expectBuildSuccess("hlt", [240]);
  });

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
  });

  test("reserved keywords: should build correct list", () => {
    expect(assembler["buildReservedKeywordsList"]()).toEqual([
      "org", "db", "dw", "dab", "daw",
      "nop", "sta", "lda", "add", "or", "and", "not",
      "jmp", "jn", "jz", "hlt"
    ]);
  });

});

describe("Neander: Run", () => {

  const values = ["V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const hexValues = ["VhF0: DB hF0", "Vh88: DB h88"];

  test("instructions: should reach expected state after running", () => {
    expectRunState(["nop"], [], { r_AC: 0, r_PC: 1 });

    // Load/Store
    expectRunState(["lda V255"], values, { r_AC: 255, r_PC: 2 });
    expectRunState(["lda V255", "sta 16"], values, { r_AC: 0XFF, r_PC: 4, m_16: 0xFF });

    // Arithmetic/Logic
    expectRunState(["lda V255", "add V255"], values, { r_AC: 254, r_PC: 4 });
    expectRunState(["lda VhF0", "or Vh88"], hexValues, { r_AC: 0xF8, r_PC: 4 });
    expectRunState(["lda VhF0", "and Vh88"], hexValues, { r_AC: 0x80, r_PC: 4 });
    expectRunState(["lda VhF0", "not"], hexValues, { r_AC: 0x0F, r_PC: 3 });

    // Jumps
    expectRunState(["jmp 16"], [], { r_AC: 0, r_PC: 16 });
    expectRunState(["lda V127", "jn 16"], values, { r_AC: 127, r_PC: 4, f_N: false });
    expectRunState(["lda V128", "jn 16"], values, { r_AC: 128, r_PC: 16, f_N: true });
    expectRunState(["lda V255", "jz 16"], values, { r_AC: 255, r_PC: 4, f_Z: false });
    expectRunState(["lda V0", "jz 16"], values, { r_AC: 0, r_PC: 16, f_Z: true });

    // Halt
    expectRunState(["nop", "nop"], [], { isRunning: true, r_PC: 2 });
    expectRunState(["hlt", "nop"], [], { isRunning: false, r_PC: 1 });
  });

  test("flags: should match AC", () => {
    // Load
    expectRunState(["lda V0"], values, { f_N: false, f_Z: true });
    expectRunState(["lda V127"], values, { f_N: false, f_Z: false });
    expectRunState(["lda V128"], values, { f_N: true, f_Z: false });

    // Arithmetic/Logic
    expectRunState(["lda V127", "add V128"], values, { r_AC: 255, f_N: true, f_Z: false });
    expectRunState(["lda V127", "or V128"], values, { r_AC: 255, f_N: true, f_Z: false });
    expectRunState(["lda V127", "and V128"], values, { r_AC: 0, f_N: false, f_Z: true });
    expectRunState(["lda V127", "not"], values, { r_AC: 128, f_N: true, f_Z: false });
  });

  test("flags: should not change when AC doesn't", () => {
    expectRunState(["lda V128", "nop"], values, { f_N: true, f_Z: false });
    expectRunState(["lda V128", "sta 0"], values, { f_N: true, f_Z: false });
    expectRunState(["lda V128", "jmp 16"], values, { f_N: true, f_Z: false });
    expectRunState(["lda V128", "hlt"], values, { f_N: true, f_Z: false });
  });

  test("registers: should overflow at 256", () => {
    expectRunState(["lda V128", "add V128"], values, { r_AC: 0, f_N: false, f_Z: true });
    expectRunState(["jmp 255", ""], [], { r_PC: 0 });
  });

});

describe("Neander: Disassembler", () => {

  test("nop: should be an empty string", () => {
    expectInstructionStrings(["nop", "hlt"], ["", "HLT"]);
  });

  test("invalid opcodes: should be empty strings", () => {
    expectInstructionStrings(["db hB0", "hlt"], ["", "HLT"]);
    expectInstructionStrings(["db hC0", "hlt"], ["", "HLT"]);
    expectInstructionStrings(["db hD0", "hlt"], ["", "HLT"]);
    expectInstructionStrings(["db hE0", "hlt"], ["", "HLT"]);
  });

  test("instructions: should include correct arguments in one string", () => {
    expectInstructionStrings(["nop", "hlt"], ["", "HLT"]);
    expectInstructionStrings(["sta 128", "hlt"], ["STA 128", "", "HLT"]);
    expectInstructionStrings(["lda 128", "hlt"], ["LDA 128", "", "HLT"]);
    expectInstructionStrings(["add 128", "hlt"], ["ADD 128", "", "HLT"]);
    expectInstructionStrings(["or 128", "hlt"], ["OR 128", "", "HLT"]);
    expectInstructionStrings(["and 128", "hlt"], ["AND 128", "", "HLT"]);
    expectInstructionStrings(["not", "hlt"], ["NOT", "HLT"]);
    expectInstructionStrings(["jmp 128", "hlt"], ["JMP 128", "", "HLT"]);
    expectInstructionStrings(["jn 128", "hlt"], ["JN 128", "", "HLT"]);
    expectInstructionStrings(["jz 128", "hlt"], ["JZ 128", "", "HLT"]);
    expectInstructionStrings(["hlt", "hlt"], ["HLT", "HLT"]);
  });

});
