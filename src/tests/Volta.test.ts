import { Assembler } from "../core/Assembler";
import { Volta } from "../core/machines/Volta";
import { range } from "../core/utils/FunctionUtils";
import { expectNextOperandAddressAndStep, makeFunction_expectBuildSuccess, makeFunction_expectRunState } from "./utils/MachineTestFunctions";

const machine = new Volta();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectRunState = makeFunction_expectRunState(assembler, machine);

describe("Volta: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0b00000000]);
    expectBuildSuccess("add", [0b00010001]);
    expectBuildSuccess("sub", [0b00010010]);
    expectBuildSuccess("and", [0b00010011]);
    expectBuildSuccess("or", [0b00010100]);
    expectBuildSuccess("clr", [0b00100001]);
    expectBuildSuccess("not", [0b00100010]);
    expectBuildSuccess("neg", [0b00100011]);
    expectBuildSuccess("inc", [0b00100100]);
    expectBuildSuccess("dec", [0b00100101]);
    expectBuildSuccess("asr", [0b00110001]);
    expectBuildSuccess("asl", [0b00110010]);
    expectBuildSuccess("ror", [0b00110011]);
    expectBuildSuccess("rol", [0b00110100]);
    expectBuildSuccess("sz", [0b01000001]);
    expectBuildSuccess("snz", [0b01000010]);
    expectBuildSuccess("spl", [0b01000011]);
    expectBuildSuccess("smi", [0b01000100]);
    expectBuildSuccess("spz", [0b01000101]);
    expectBuildSuccess("smz", [0b01000110]);
    expectBuildSuccess("seq", [0b01010001]);
    expectBuildSuccess("sne", [0b01010010]);
    expectBuildSuccess("sgr", [0b01010011]);
    expectBuildSuccess("sls", [0b01010100]);
    expectBuildSuccess("sge", [0b01010101]);
    expectBuildSuccess("sle", [0b01010110]);
    expectBuildSuccess("rts", [0b01100001]);
    expectBuildSuccess("psh 128", [0b01110000, 128]);
    expectBuildSuccess("pop 128", [0b10000000, 128]);
    expectBuildSuccess("jmp 128", [0b10010000, 128]);
    expectBuildSuccess("jsr 128", [0b10100000, 128]);
    expectBuildSuccess("hlt", [0b11110000]);
  });

  test("addressing modes: should build correct binary", () => {
    expectBuildSuccess("psh 128,I\npop 128,I", [0b01110001, 128, 0b10000001, 128]); // Indirect (PSH/POP)
    expectBuildSuccess("jmp 128,I\njsr 128,I", [0b10010001, 128, 0b10100001, 128]); // Indirect (JMP/JSR)
    expectBuildSuccess("psh #128\npop #128", [0b01110010, 128, 0b10000010, 128]); // Immediate (PSH/POP)
    expectBuildSuccess("jmp #128\njsr #128", [0b10010010, 128, 0b10100010, 128]); // Immediate (JMP/JSR)
    expectBuildSuccess("psh 128,PC\npop 128,PC", [0b01110011, 128, 0b10000011, 128]); // Indexed by PC (PSH/POP)
    expectBuildSuccess("jmp 128,PC\njsr 128,PC", [0b10010011, 128, 0b10100011, 128]); // Indexed by PC (JMP/JSR)
  });

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
  });

  test("reserved keywords: should build correct list", () => {
    expect(assembler["buildReservedKeywordsList"]()).toEqual([
      "org", "db", "dw", "dab", "daw",
      "nop", "add", "sub", "and", "or", "clr", "not", "neg",
      "inc", "dec", "asr", "asl", "ror", "rol",
      "sz", "snz", "spl", "smi", "spz", "smz",
      "seq", "sne", "sgr", "sls", "sge", "sle",
      "rts", "psh", "pop", "jmp", "jsr", "hlt",
      "i", "pc"
    ]);
  });

});

describe("Volta: Run", () => {

  const values = ["V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const addresses = ["ORG 10", "A10V20: DB 20", "A11V21: DB 21", "ORG 20", "A20V30: DB 30"];

  test("instructions: should reach expected state after running", () => {

    expectRunState(["nop"], [], { r_PC: 1, r_SP: 0 });

    // Push/Pop
    expectRunState(["psh #10"], values, { s_1: 10, r_PC: 2, r_SP: 1 });
    expectRunState(["psh #10", "pop 100"], values, { s_1: 10, m_100: 10, r_PC: 4, r_SP: 0 });

    // Arithmetic/Logic
    expectRunState(["psh #-1", "psh #2", "add", "pop 100"], [], { m_100: 1, r_PC: 7, r_SP: 0 });
    expectRunState(["psh #-1", "psh #2", "sub", "pop 100"], [], { m_100: 253, r_PC: 7, r_SP: 0 });
    expectRunState(["psh #hF0", "psh #h88", "and", "pop 100"], [], { m_100: 0x80, r_PC: 7, r_SP: 0 });
    expectRunState(["psh #hF0", "psh #h88", "or", "pop 100"], [], { m_100: 0xF8, r_PC: 7, r_SP: 0 });
    expectRunState(["psh #1", "clr", "pop 100"], [], { m_100: 0, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #h0F", "not", "pop 100"], [], { m_100: 0xF0, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #0", "neg", "pop 100"], [], { m_100: 0, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "neg", "pop 100"], [], { m_100: 129, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #128", "neg", "pop 100"], [], { m_100: 128, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #255", "neg", "pop 100"], [], { m_100: 1, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "inc", "pop 100"], [], { m_100: 128, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #255", "inc", "pop 100"], [], { m_100: 0, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #128", "dec", "pop 100"], [], { m_100: 127, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #0", "dec", "pop 100"], [], { m_100: 255, r_PC: 5, r_SP: 0 });

    // Shift/Rotate
    expectRunState(["psh #4", "asr", "pop 100"], [], { m_100: 2, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #5", "asr", "pop 100"], [], { m_100: 2, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #-1", "asr", "pop 100"], [], { m_100: -1 & 0xFF, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #-4", "asr", "pop 100"], [], { m_100: -2 & 0xFF, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #-5", "asr", "pop 100"], [], { m_100: -3 & 0xFF, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #32", "asl", "pop 100"], [], { m_100: 64, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #h81", "asl", "pop 100"], [], { m_100: 0b00000010, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #h81", "ror", "pop 100"], [], { m_100: 0b11000000, r_PC: 5, r_SP: 0 });
    expectRunState(["psh #h81", "rol", "pop 100"], [], { m_100: 0b00000011, r_PC: 5, r_SP: 0 });

    // Single-operand skips
    expectRunState(["psh #0", "sz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #1", "sz"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #-1", "sz"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #0", "snz"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #1", "snz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #-1", "snz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #0", "spl"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #127", "spl"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #-128", "spl"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #0", "smi"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #127", "smi"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #-128", "smi"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #0", "spz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #127", "spz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #-128", "spz"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #0", "smz"], [], { r_PC: 4, r_SP: 0 });
    expectRunState(["psh #127", "smz"], [], { r_PC: 3, r_SP: 0 });
    expectRunState(["psh #-128", "smz"], [], { r_PC: 4, r_SP: 0 });

    // Comparison skips
    expectRunState(["psh #1", "psh #1", "seq"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #1", "psh #0", "seq"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #0", "psh #1", "seq"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #1", "psh #1", "sne"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #1", "psh #0", "sne"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #0", "psh #1", "sne"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #127", "psh #127", "sgr"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "psh #126", "sgr"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #128", "psh #127", "sgr"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "psh #127", "sls"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "psh #126", "sls"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #128", "psh #127", "sls"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #127", "psh #127", "sge"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #127", "psh #126", "sge"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #128", "psh #127", "sge"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #127", "psh #127", "sle"], [], { r_PC: 6, r_SP: 0 });
    expectRunState(["psh #127", "psh #126", "sle"], [], { r_PC: 5, r_SP: 0 });
    expectRunState(["psh #128", "psh #127", "sle"], [], { r_PC: 6, r_SP: 0 });

    // Jumps / Subroutines
    expectRunState(["jmp 128"], [], { r_PC: 128, r_SP: 0 });
    expectRunState(["nop", "jsr 128"], [], { s_1: 3, r_PC: 128, r_SP: 1 });
    expectRunState(["nop", "jsr 128", "hlt", "org 128", "rts"], [], { s_1: 3, r_PC: 4, r_SP: 0 });

    // Halt
    expectRunState(["nop", "nop"], [], { isRunning: true, r_PC: 2 });
    expectRunState(["hlt", "nop"], [], { isRunning: false, r_PC: 1 });
  });

  test("skips: should correctly skip next instruction", () => {
    expectRunState(["sz", "jmp 10", "jmp 20", "org 20", "hlt"], [], { r_PC: 21 }); // 2-byte skip
    expectRunState(["sz", "hlt", "jmp 20", "org 20", "hlt"], [], { r_PC: 21 }); // 1-byte skip
  });

  test("addressing modes: should map to correct address/value", () => {

    // Push
    expectRunState(["psh A10V20"], addresses, { s_1: 20 });
    expectRunState(["psh A10V20,I"], addresses, { s_1: 30 });
    expectRunState(["psh #40"], [], { s_1: 40 });
    expectRunState(["psh 20,PC"], ["ORG 22", "DB 16"], { s_1: 16, r_PC: 2 });

    // Pop
    expectRunState(["psh #16", "pop 10"], [], { m_10: 16 });
    expectRunState(["psh #16", "pop A10V20,I"], addresses, { m_20: 16 });
    expectRunState(["psh #16", "pop #32"], [], { s_1: 16, m_3: 16, m_32: 0 }); // Value 32 is unused
    expectRunState(["psh #16", "pop 20,PC"], [], { s_1: 16, m_24: 16, r_PC: 4 });

    // Overflow
    expectRunState(["psh #16", "jmp 252", "org 252", "pop 100,PC"], addresses, { m_98: 16 });

    // Jump
    expectRunState(["jmp 10"], [], { r_PC: 10 });
    expectRunState(["jmp A10V20,I"], addresses, { r_PC: 20 });
    expectRunState(["jmp #40"], [], { r_PC: 2 }); // Ignored
    expectRunState(["jmp 10,PC"], [], { r_PC: 12 });

    // Jump to Subroutine
    expectRunState(["jsr 10"], [], { r_PC: 10 });
    expectRunState(["jsr A10V20,I"], addresses, { r_PC: 20 });
    expectRunState(["jsr #40"], [], { r_PC: 2 }); // Ignored
    expectRunState(["jsr 10,PC"], [], { r_PC: 12 });
  });

  test("stack: should have correct size", () => {
    expect(machine.getStackSize()).toBe(64);
  });

  test("registers: should overflow at 256 (PC) or 64 (SP)", () => {
    expectRunState(["jmp 255", ""], [], { r_PC: 0 });
    expectRunState(range(63).map(() => "psh #1"), values, { r_SP: 63 });
    expectRunState(range(64).map(() => "psh #1"), values, { r_SP: 0 });
    expectRunState(range(63).map(() => "pop #1"), values, { r_SP: 1 });
    expectRunState(range(64).map(() => "pop #1"), values, { r_SP: 0 });
  });

  test("operands: should be mapped correctly for highlighting", () => {
    expect(assembler.build(["psh 10", "psh 20,I", "psh #-2", "psh 30,PC", "nop", "org 20", "dab 250, 251"].join("\n"))).toEqual([]);
    expectNextOperandAddressAndStep(machine, 10); // Direct
    expectNextOperandAddressAndStep(machine, 250, 20); // Indirect
    expectNextOperandAddressAndStep(machine, 5); // Immediate
    expectNextOperandAddressAndStep(machine, 30 + 8); // Indexed by PC
    expectNextOperandAddressAndStep(machine, -1); // NOP
  });

});
