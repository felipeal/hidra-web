import { } from "./utils/CustomExtends";
import { Assembler } from "../core/Assembler";
import { Neander } from "../machines/Neander";
import { makeFunction_expectBuildSuccess, makeFunction_expectRunState } from "./utils/MachineTestFunctions";

const machine = new Neander();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectRunState = makeFunction_expectRunState(assembler, machine);

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

});

describe("Neander: Run", () => {

  const values = ["V0: DB 0", "V127: DB 127", "V128: DB 128", "V255: DB 255"];
  const hexValues = ["VhF0: DB hF0", "Vh88: DB h88"];

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

    // Jumps
    expectRunState(["jmp 16"], 1, {r_AC: 0, r_PC: 16});
    expectRunState(["lda V127", "jn 16", ...values], 2, {r_AC: 127, r_PC: 4, f_N: false});
    expectRunState(["lda V128", "jn 16", ...values], 2, {r_AC: 128, r_PC: 16, f_N: true});
    expectRunState(["lda V255", "jz 16", ...values], 2, {r_AC: 255, r_PC: 4, f_Z: false});
    expectRunState(["lda V0", "jz 16", ...values], 2, {r_AC: 0, r_PC: 16, f_Z: true});

    // Halt
    expectRunState(["nop", "nop"], 2, {isRunning: true, r_PC: 2});
    expectRunState(["hlt", "nop"], 2, {isRunning: false, r_PC: 1});
  });

  test("flags: should match AC", () => {
    // Load
    expectRunState(["lda V0", ...values], 1, {f_N: false, f_Z: true});
    expectRunState(["lda V127", ...values], 1, {f_N: false, f_Z: false});
    expectRunState(["lda V128", ...values], 1, {f_N: true, f_Z: false});

    // Arithmetic/Logic
    expectRunState(["lda V127", "add V128", ...values], 2, {r_AC: 255, f_N: true, f_Z: false});
    expectRunState(["lda V127", "or V128", ...values], 2, {r_AC: 255, f_N: true, f_Z: false});
    expectRunState(["lda V127", "and V128", ...values], 2, {r_AC: 0, f_N: false, f_Z: true});
    expectRunState(["lda V127", "not", ...values], 2, {r_AC: 128, f_N: true, f_Z: false});
  });

  test("flags: should not change when AC doesn't", () => {
    expectRunState(["lda V128", "nop", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "sta 0", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "jmp 16", ...values], 2, {f_N: true, f_Z: false});
    expectRunState(["lda V128", "hlt", ...values], 2, {f_N: true, f_Z: false});
  });

  test("registers: should overflow at 256", () => {
    expectRunState(["lda V128", "add V128", ...values], 2, {r_AC: 0, f_N: false, f_Z: true});
    expectRunState(["jmp 255"], 2, {r_PC: 0});
  });

});
