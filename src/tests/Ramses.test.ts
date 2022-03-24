import { } from "./utils/CustomExtends";
import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/Errors";
import { Ramses } from "../machines/Ramses";
import { makeFunction_expectBuildError, makeFunction_expectBuildSuccess, makeFunction_expectRunState } from "./utils/MachineTestFunctions";

const machine = new Ramses();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectBuildError = makeFunction_expectBuildError(assembler);
const expectRunState = makeFunction_expectRunState(assembler, machine);

describe("Ramses: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0x00]);
    expectBuildSuccess("str A 128", [0x10, 128]);
    expectBuildSuccess("ldr A 128", [0x20, 128]);
    expectBuildSuccess("add A 128", [0x30, 128]);
    expectBuildSuccess("or A 128", [0x40, 128]);
    expectBuildSuccess("and A 128", [0x50, 128]);
    expectBuildSuccess("not A", [0x60]);
    expectBuildSuccess("sub A 128", [0x70, 128]);
    expectBuildSuccess("jmp 128", [0x80, 128]);
    expectBuildSuccess("jn 128", [0x90, 128]);
    expectBuildSuccess("jz 128", [0xA0, 128]);
    expectBuildSuccess("jc 128", [0xB0, 128]);
    expectBuildSuccess("jsr 128", [0xC0, 128]);
    expectBuildSuccess("neg A", [0xD0]);
    expectBuildSuccess("shr A", [0xE0]);
    expectBuildSuccess("hlt", [0xF0]);
  });

  test("addressing modes: should build correct binary", () => {
    expectBuildSuccess("str A 128", [0x10, 128]); // Direct
    expectBuildSuccess("str A 128,I", [0x11, 128]); // Indirect
    expectBuildSuccess("str A #128", [0x12, 128]); // Immediate
    expectBuildSuccess("str A 128,X", [0x13, 128]); // Indexed by X
  });

  test("registers: should build correct binary", () => {
    expectBuildSuccess("str A 128", [0x10, 128]);
    expectBuildSuccess("str B 128", [0x14, 128]);
    expectBuildSuccess("str X 128", [0x18, 128]);
    expectBuildError("str PC 128", AssemblerErrorCode.INVALID_ARGUMENT);
  });

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
  });

});

describe("Ramses: Run", () => {

  const values = ["V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const hexValues = ["VhF0: DB hF0", "Vh88: DB h88"];
  const binValues = ["Vb10000001: DB h81"];
  const addresses = ["ORG 10", "A10V20: DB 20", "A11V21: DB 21", "ORG 20", "A20V30: DB 30"];

  test("instructions: should reach expected state after running", () => {

    expectRunState(["nop"], 1, {r_A: 0, r_PC: 1});

    // Load/Store
    expectRunState(["ldr A V255", ...values], 1, {r_A: 255, r_PC: 2});
    expectRunState(["ldr A V255", "str A 16", ...values], 2, {r_A: 0XFF, r_PC: 4, m_16: 0xFF});

    // Arithmetic/Logic
    expectRunState(["ldr A V255", "add A V255", ...values], 2, {r_A: 254, r_PC: 4});
    expectRunState(["ldr A VhF0", "or A Vh88", ...hexValues], 2, {r_A: 0xF8, r_PC: 4});
    expectRunState(["ldr A VhF0", "and A Vh88", ...hexValues], 2, {r_A: 0x80, r_PC: 4});
    expectRunState(["ldr A VhF0", "not A", ...hexValues], 2, {r_A: 0x0F, r_PC: 3});
    expectRunState(["ldr A V128", "sub A V255", ...values], 2, {r_A: 129, r_PC: 4});

    // Jumps
    expectRunState(["jmp 16"], 1, {r_A: 0, r_PC: 16});
    expectRunState(["ldr A V127", "jn 16", ...values], 2, {r_A: 127, r_PC: 4, f_N: false});
    expectRunState(["ldr A V128", "jn 16", ...values], 2, {r_A: 128, r_PC: 16, f_N: true});
    expectRunState(["ldr A V255", "jz 16", ...values], 2, {r_A: 255, r_PC: 4, f_Z: false});
    expectRunState(["ldr A V0", "jz 16", ...values], 2, {r_A: 0, r_PC: 16, f_Z: true});
    expectRunState(["sub A V255", "jc 16", ...values], 2, {r_A: 1, r_PC: 4, f_C: false});
    expectRunState(["sub A V0", "jc 16", ...values], 2, {r_A: 0, r_PC: 16, f_C: true});
    expectRunState(["nop", "jsr 16"], 2, {r_PC: 17, m_16: 3});

    // Logic
    expectRunState(["ldr A V0", "neg A", ...values], 2, {r_A: 0, r_PC: 3});
    expectRunState(["ldr A V127", "neg A", ...values], 2, {r_A: 129, r_PC: 3});
    expectRunState(["ldr A V128", "neg A", ...values], 2, {r_A: 128, r_PC: 3});
    expectRunState(["ldr A V255", "neg A", ...values], 2, {r_A: 1, r_PC: 3});
    expectRunState(["ldr A Vb10000001", "shr A", ...binValues], 2, {r_PC: 3, r_A: 0b01000000, f_C: true});
    expectRunState(["ldr A Vb10000001", "shr A", "shr A", ...binValues], 3, {r_PC: 4, r_A: 0b00100000, f_C: false});

    // Halt
    expectRunState(["nop", "nop"], 2, {isRunning: true, r_PC: 2});
    expectRunState(["hlt", "nop"], 2, {isRunning: false, r_PC: 1});
  });

  test("flags: N/Z should match last updated register", () => {
    // Load
    expectRunState(["ldr a V0", ...values], 1, {f_N: false, f_Z: true});
    expectRunState(["ldr a V127", ...values], 1, {f_N: false, f_Z: false});
    expectRunState(["ldr a V128", ...values], 1, {f_N: true, f_Z: false});

    // Load with different registers
    expectRunState(["ldr a V0", "ldr b V128", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["ldr b V0", "ldr x V128", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["ldr x V0", "ldr a V128", ...values], 2, {f_N: true, f_Z: false});

    // Arithmetic/Logic with different registers
    expectRunState(["ldr a V255", "add b V0", ...values], 2, {f_N: false, f_Z: true});
    expectRunState(["ldr a V255", "or b V0", ...values], 2, {f_N: false, f_Z: true});
    expectRunState(["ldr a V255", "and b V0", ...values], 2, {f_N: false, f_Z: true});
    expectRunState(["ldr a V0", "not b", ...values], 2, {f_N: true, f_Z: false});
  });

  test("flags: C should match last carry operation", () => {
    // Arithmetic/Logic
    expectRunState(["ldr a V128", "add a V127", ...values], 2, {r_A: 255, f_C: false});
    expectRunState(["ldr a V128", "add a V128", ...values], 2, {r_A: 0, f_C: true});
    expectRunState(["ldr a V127", "sub a V127", ...values], 2, {r_A: 0, f_C: true});
    expectRunState(["ldr a V127", "sub a V128", ...values], 2, {r_A: 255, f_C: false});
    expectRunState(["ldr a V0", "neg a", ...values], 2, {r_A: 0, f_C: true});
    expectRunState(["ldr a V127", "neg a", ...values], 2, {r_A: 129, f_C: false});
    expectRunState(["ldr a V127", "neg a", "neg a", ...values], 3, {r_A: 127, f_C: false});
    expectRunState(["ldr a V128", "neg a", ...values], 2, {r_A: 128, f_C: false});
    expectRunState(["ldr a V255", "neg a", ...values], 2, {r_A: 1, f_C: false});
    expectRunState(["ldr a V255", "neg a", "neg a", ...values], 3, {r_A: 255, f_C: false});
    expectRunState(["ldr A V127", "shr A", ...values], 2, {f_C: true});
    expectRunState(["ldr A V128", "shr A", ...values], 2, {f_C: false});

    // Arithmetic/Logic with different registers
    expectRunState(["ldr a V255", "add a V255", "add b V0", ...values], 3, {f_C: false}); // Updates carry
    expectRunState(["ldr a V255", "add a V255", "or b V0", ...values], 3, {f_C: true});
    expectRunState(["ldr a V255", "add a V255", "and b V0", ...values], 3, {f_C: true});
    expectRunState(["ldr a V255", "add a V255", "not b", ...values], 3, {f_C: true});
    expectRunState(["ldr a V255", "add a V255", "sub b V127", ...values], 3, {f_C: false}); // Updates carry
    expectRunState(["ldr a V255", "add a V0", "neg b", ...values], 3, {f_C: true}); // Updates carry
    expectRunState(["ldr a V255", "add a V255", "shr b", ...values], 3, {f_C: false}); // Updates carry
  });

  test("addressing modes: should map to correct address/value", () => {
    // Load
    expectRunState(["ldr A A10V20", ...addresses], 1, {r_A: 20});
    expectRunState(["ldr A A10V20,I", ...addresses], 1, {r_A: 30});
    expectRunState(["ldr A #40", ...addresses], 1, {r_A: 40});
    expectRunState(["ldr X #1", "ldr A A10V20,X", ...addresses], 2, {r_A: 21});

    // Store
    expectRunState(["ldr A #16", "str A 10"], 2, {m_10: 16});
    expectRunState(["ldr A #16", "str A A10V20,I", ...addresses], 2, {m_20: 16});
    expectRunState(["ldr A #16", "str A #32"], 2, {r_A: 16, m_3: 16, m_32: 0}); // Value 32 is unused
    expectRunState(["ldr A #16", "ldr X #1", "str A A10V20,X", ...addresses], 3, {m_11: 16});

    // Overflow
    expectRunState(["ldr X #255", "ldr A A11V21,X", ...addresses], 2, {r_A: 20});
    expectRunState(["ldr X #-1", "ldr A A11V21,X", ...addresses], 2, {r_A: 20});

    // Arithmetic
    expectRunState(["add A A10V20", ...addresses], 1, {r_A: 20});
    expectRunState(["add A A10V20,I", ...addresses], 1, {r_A: 30});
    expectRunState(["add A #40"], 1, {r_A: 40});
    expectRunState(["ldr X #1", "add A A10V20,X", ...addresses], 2, {r_A: 21});

    // Jumps
    expectRunState(["jmp 10"], 1, {r_PC: 10});
    expectRunState(["jmp A10V20,I", ...addresses], 1, {r_PC: 20});
    expectRunState(["jmp #40"], 1, {r_PC: 2}); // Ignored
    expectRunState(["ldr X #1", "jmp 10,X"], 2, {r_PC: 11});
  });

  test("registers: should work independently", () => {
    expectRunState(["ldr a #10", "ldr b #20", "ldr x #30"], 3, {r_A: 10, r_B: 20, r_X: 30});
  });

  test("registers: should not expose a 4th register on bit pattern ....11..", () => {
    // Note: Undefined behavior. Hidra will always return 0. On WRamses, a 4th registry "?" is exposed.
    expectRunState([
      "dab 46, 10", // LDR ? #10
      "dab 28, 0" // STR ? 0
    ], 2, {m_0: 0});
  });

});
