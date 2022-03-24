import { } from "./utils/CustomExtends";
import { Assembler } from "../core/Assembler";
import { Ahmes } from "../machines/Ahmes";
import { makeFunction_expectBuildSuccess, makeFunction_expectRunState } from "./utils/MachineTestFunctions";

const machine = new Ahmes();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectRunState = makeFunction_expectRunState(assembler, machine);

describe("Ahmes: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess("nop", [0]);
    expectBuildSuccess("sta 128", [16, 128]);
    expectBuildSuccess("lda 128", [32, 128]);
    expectBuildSuccess("add 128", [48, 128]);
    expectBuildSuccess("or 128", [64, 128]);
    expectBuildSuccess("and 128", [80, 128]);
    expectBuildSuccess("not", [96]);
    expectBuildSuccess("sub 128", [112]);
    expectBuildSuccess("jmp 128", [128, 128]);
    expectBuildSuccess("jn 128", [144, 128]);
    expectBuildSuccess("jp 128", [148, 128]);
    expectBuildSuccess("jv 128", [152, 128]);
    expectBuildSuccess("jnv 128", [156, 128]);
    expectBuildSuccess("jz 128", [160, 128]);
    expectBuildSuccess("jnz 128", [164, 128]);
    expectBuildSuccess("jc 128", [176, 128]);
    expectBuildSuccess("jnc 128", [180, 128]);
    expectBuildSuccess("jb 128", [184, 128]);
    expectBuildSuccess("jnb 128", [188, 128]);
    expectBuildSuccess("shr", [224]);
    expectBuildSuccess("shl", [225]);
    expectBuildSuccess("ror", [226]);
    expectBuildSuccess("rol", [227]);
    expectBuildSuccess("hlt", [240]);
  });

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
  });

});

describe("Ahmes: Run", () => {

  const values = ["V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const hexValues = ["Vh88: DB h88", "VhF0: DB hF0"];
  const binValues = ["Vb10000001: DB h81"];

  test("instructions: should reach expected state after running", () => {
    expectRunState(["nop"], 1, {r_AC: 0, r_PC: 1});

    // Load/Store
    expectRunState(["lda V255", ...values], 1, {r_AC: 255, r_PC: 2});
    expectRunState(["lda V255", "sta 16", ...values], 2, {r_AC: 0XFF, r_PC: 4, m_16: 0xFF});

    // Arithmetic/Logic
    expectRunState(["lda V255", "add V255", ...values], 2, {r_AC: 254, r_PC: 4});
    expectRunState(["lda VhF0", "or Vh88", ...hexValues], 2, {r_AC: 0xF8, r_PC: 4});
    expectRunState(["lda VhF0", "and Vh88", ...hexValues], 2, {r_AC: 0x80, r_PC: 4});
    expectRunState(["lda VhF0", "not", ...hexValues], 2, {r_AC: 0x0F, r_PC: 3});
    expectRunState(["lda V128", "sub V255", ...values], 2, {r_AC: 129, r_PC: 4});

    // Jumps
    expectRunState(["jmp 16"], 1, {r_AC: 0, r_PC: 16});
    expectRunState(["lda V127", "jn 16", ...values], 2, {r_AC: 127, r_PC: 4, f_N: false});
    expectRunState(["lda V128", "jn 16", ...values], 2, {r_AC: 128, r_PC: 16, f_N: true});
    expectRunState(["lda V0", "jp 16", ...values], 2, {r_AC: 0, r_PC: 16, f_Z: true});
    expectRunState(["lda V127", "jp 16", ...values], 2, {r_AC: 127, r_PC: 16, f_N: false});
    expectRunState(["lda V128", "jp 16", ...values], 2, {r_AC: 128, r_PC: 4, f_N: true});
    expectRunState(["lda V127", "add V128", "jv 16", ...values], 3, {r_AC: 255, r_PC: 6, f_V: false});
    expectRunState(["lda V127", "add V127", "jv 16", ...values], 3, {r_AC: 254, r_PC: 16, f_V: true});
    expectRunState(["lda V127", "add V128", "jnv 16", ...values], 3, {r_AC: 255, r_PC: 16, f_V: false});
    expectRunState(["lda V127", "add V127", "jnv 16", ...values], 3, {r_AC: 254, r_PC: 6, f_V: true});
    expectRunState(["lda V255", "jz 16", ...values], 2, {r_AC: 255, r_PC: 4, f_Z: false});
    expectRunState(["lda V0", "jz 16", ...values], 2, {r_AC: 0, r_PC: 16, f_Z: true});
    expectRunState(["lda V255", "jnz 16", ...values], 2, {r_AC: 255, r_PC: 16, f_Z: false});
    expectRunState(["lda V0", "jnz 16", ...values], 2, {r_AC: 0, r_PC: 4, f_Z: true});
    expectRunState(["lda V255", "add V255", "jc 16", ...values], 3, {r_AC: 254, r_PC: 16, f_C: true});
    expectRunState(["lda V128", "add V127", "jc 16", ...values], 3, {r_AC: 255, r_PC: 6, f_C: false});
    expectRunState(["lda V255", "add V255", "jnc 16", ...values], 3, {r_AC: 254, r_PC: 6, f_C: true});
    expectRunState(["lda V128", "add V127", "jnc 16", ...values], 3, {r_AC: 255, r_PC: 16, f_C: false});
    expectRunState(["lda V127", "sub V128", "jb 16", ...values], 3, {r_AC: 255, r_PC: 16, f_B: true});
    expectRunState(["lda V128", "sub V127", "jb 16", ...values], 3, {r_AC: 1, r_PC: 6, f_B: false});
    expectRunState(["lda V127", "sub V128", "jnb 16", ...values], 3, {r_AC: 255, r_PC: 6, f_B: true});
    expectRunState(["lda V128", "sub V127", "jnb 16", ...values], 3, {r_AC: 1, r_PC: 16, f_B: false});

    // Shift/Rotate
    expectRunState(["lda Vb10000001", "shr", "nop", ...binValues], 3, {r_PC: 4, r_AC: 0b01000000, f_C: true});
    expectRunState(["lda Vb10000001", "shr", "shr", ...binValues], 3, {r_PC: 4, r_AC: 0b00100000, f_C: false});
    expectRunState(["lda Vb10000001", "shl", "nop", ...binValues], 3, {r_PC: 4, r_AC: 0b00000010, f_C: true});
    expectRunState(["lda Vb10000001", "shl", "shl", ...binValues], 3, {r_PC: 4, r_AC: 0b00000100, f_C: false});
    expectRunState(["lda Vb10000001", "ror", "nop", ...binValues], 3, {r_PC: 4, r_AC: 0b01000000, f_C: true});
    expectRunState(["lda Vb10000001", "ror", "ror", ...binValues], 3, {r_PC: 4, r_AC: 0b10100000, f_C: false});
    expectRunState(["lda Vb10000001", "rol", "nop", ...binValues], 3, {r_PC: 4, r_AC: 0b00000010, f_C: true});
    expectRunState(["lda Vb10000001", "rol", "rol", ...binValues], 3, {r_PC: 4, r_AC: 0b00000101, f_C: false});

    // Halt
    expectRunState(["nop", "nop"], 2, {isRunning: true, r_PC: 2});
    expectRunState(["hlt", "nop"], 2, {isRunning: false, r_PC: 1});
  });

  test("flags: N/Z should match AC", () => {
    // Load/Store
    expectRunState(["lda V0", ...values], 1, {f_N: false, f_Z: true});
    expectRunState(["lda V127", ...values], 1, {f_N: false, f_Z: false});
    expectRunState(["lda V128", ...values], 1, {f_N: true, f_Z: false});

    expectRunState(["lda V255", ...values], 1, {r_AC: 255, r_PC: 2});
    expectRunState(["lda V255", "sta 16", ...values], 2, {r_AC: 0XFF, r_PC: 4, m_16: 0xFF});

    // Arithmetic/Logic
    expectRunState(["lda V127", "add V128", ...values], 2, {r_AC: 255, f_N: true, f_Z: false});
    expectRunState(["lda V127", "or V128", ...values], 2, {r_AC: 255, f_N: true, f_Z: false});
    expectRunState(["lda V127", "and V128", ...values], 2, {r_AC: 0, f_N: false, f_Z: true});
    expectRunState(["lda V127", "not", ...values], 2, {r_AC: 128, f_N: true, f_Z: false});
    expectRunState(["lda V127", "sub V128", ...values], 2, {r_AC: 255, f_N: true, f_Z: false});

    // Shift/Rotate
    expectRunState(["lda V128", "shr", ...values], 2, {r_AC: 64, f_N: false, f_Z: false});
    expectRunState(["lda V127", "shl", ...values], 2, {r_AC: 254, f_N: true, f_Z: false});
    expectRunState(["lda V128", "ror", ...values], 2, {r_AC: 64, f_N: false, f_Z: false});
    expectRunState(["lda V127", "rol", ...values], 2, {r_AC: 254, f_N: true, f_Z: false});
  });

  test("flags: N/Z should not change when AC doesn't", () => {
    expectRunState(["lda V128", "nop", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "sta 0", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "jmp 16", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "hlt", ...values], 2, {f_N: true, f_Z: false});
  });

  test("flags: C should match last carry operation", () => {
    // Arithmetic/Logic
    expectRunState(["lda V128", "add V127", ...values], 2, {r_AC: 255, f_C: false});
    expectRunState(["lda V128", "add V128", ...values], 2, {r_AC: 0, f_C: true});
    expectRunState(["lda V127", "shr", ...values], 2, {f_C: true});
    expectRunState(["lda V128", "shr", ...values], 2, {f_C: false});
    expectRunState(["lda V128", "shl", ...values], 2, {f_C: true});
    expectRunState(["lda V127", "shl", ...values], 2, {f_C: false});
    expectRunState(["lda V127", "ror", ...values], 2, {f_C: true});
    expectRunState(["lda V128", "ror", ...values], 2, {f_C: false});
    expectRunState(["lda V128", "rol", ...values], 2, {f_C: true});
    expectRunState(["lda V127", "rol", ...values], 2, {f_C: false});

    // Should not update carry
    expectRunState(["lda V255", "add V255", "or V0", ...values], 3, {f_C: true});
    expectRunState(["lda V255", "add V255", "and V0", ...values], 3, {f_C: true});
    expectRunState(["lda V255", "add V255", "not", ...values], 3, {f_C: true});
    expectRunState(["lda V255", "add V255", "sub V0", ...values], 3, {f_C: true});
    expectRunState(["lda V255", "add V255", "sub V255", ...values], 3, {f_C: true});
  });

  test("flags: B should match last borrow operation", () => {
    // Subtraction
    expectRunState(["lda V128", "sub V127", ...values], 2, {r_AC: 1, f_B: false});
    expectRunState(["lda V128", "sub V128", ...values], 2, {r_AC: 0, f_B: false});
    expectRunState(["lda V127", "sub V128", ...values], 2, {r_AC: 255, f_B: true});
    expectRunState(["lda V0", "sub V255", ...values], 2, {r_AC: 1, f_B: true});

    // Should not update borrow
    expectRunState(["sub V255", "add V0", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "or V0", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "and V0", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "not", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "shr", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "shl", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "ror", ...values], 2, {f_B: true});
    expectRunState(["sub V255", "rol", ...values], 2, {f_B: true});
  });

  test("flags: V should match last overflow operation", () => {
    // Arithmetic
    expectRunState(["lda V127", "add V127", ...values], 2, {r_AC: 254, f_V: true}); // 127 + 127
    expectRunState(["lda V128", "add V128", ...values], 2, {r_AC: 0, f_V: true}); // (-128) + (-128)
    expectRunState(["lda V127", "add V128", ...values], 2, {r_AC: 255, f_V: false}); // 127 + (-128)
    expectRunState(["lda V128", "add V127", ...values], 2, {r_AC: 255, f_V: false}); // (-128) + 127
    expectRunState(["lda V127", "sub V127", ...values], 2, {r_AC: 0, f_V: false}); // 127 - 127
    expectRunState(["lda V128", "sub V128", ...values], 2, {r_AC: 0, f_V: false}); // (-128) - (-128)
    expectRunState(["lda V127", "sub V128", ...values], 2, {r_AC: 255, f_V: true}); // 127 - (-128)
    expectRunState(["lda V128", "sub V127", ...values], 2, {r_AC: 1, f_V: true}); // (-128) - 127
    expectRunState(["lda V127", "sub V255", ...values], 2, {r_AC: 128, f_V: true}); // 127 - (-1)
    expectRunState(["lda V255", "sub V127", ...values], 2, {r_AC: 128, f_V: false}); // (-1) - 127

    // Should not update overflow
    expectRunState(["lda V127", "add V127", "or V0", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "and V0", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "not", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "shr", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "shl", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "ror", ...values], 3, {f_V: true});
    expectRunState(["lda V127", "add V127", "rol", ...values], 3, {f_V: true});
  });

  test("registers: should overflow at 256", () => {
    expectRunState(["lda V128", "add V128", ...values], 2, {r_AC: 0, f_N: false, f_Z: true});
    expectRunState(["jmp 255"], 2, {r_PC: 0});
  });

});
