import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/AssemblerError";
import { Reg } from "../core/machines/Reg";
import { range } from "../core/utils/FunctionUtils";
import {
  makeFunction_expectBuildError, makeFunction_expectBuildSuccess, makeFunction_expectInstructionStrings, makeFunction_expectRunState
} from "./utils/MachineTestFunctions";

const machine = new Reg();
const assembler = new Assembler(machine);

const expectBuildSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectBuildError = makeFunction_expectBuildError(assembler);
const expectRunState = makeFunction_expectRunState(assembler, machine);
const expectInstructionStrings = makeFunction_expectInstructionStrings(assembler, machine);

describe("Reg: Build", () => {

  test("instructions: should build correct binary", () => {
    expectBuildSuccess(["inc R0", "inc R63"], [0, 63]);
    expectBuildSuccess(["dec R0", "dec R63"], [64, 127]);
    expectBuildSuccess(["if R0 10 20", "if R63 10 20"], [128, 10, 20, 191, 10, 20]);
    expectBuildSuccess(["hlt"], [192]);
  });

  test("registers: should detect invalid registers/arguments", () => {
    expectBuildError("inc R64", AssemblerErrorCode.INVALID_ARGUMENT);
    expectBuildError("dec R64", AssemblerErrorCode.INVALID_ARGUMENT);
    expectBuildError("if R64 1 2", AssemblerErrorCode.INVALID_ARGUMENT);
    expectBuildError("if R64 1", AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    expectBuildError("if R64 1 2 3", AssemblerErrorCode.TOO_MANY_ARGUMENTS);
  });

  test("endianness: should be big endian", () => {
    expectBuildSuccess("dw h1020", [0x10, 0x20]);
  });

  test("reserved keywords: should build correct list", () => {
    expect(assembler["buildReservedKeywordsList"]()).toEqual([
      "org", "db", "dw", "dab", "daw",
      "inc", "dec", "if", "hlt",
      ...range(64).map(v => `r${v}`)
    ]);
  });

});

describe("Reg: Run", () => {

  test("instructions: should reach expected state after running", () => {
    // Inc/Dec
    expectRunState(["inc R0"], [], { r_R0: 1, r_PC: 1 });
    expectRunState(["dec R0"], [], { r_R0: 255, r_PC: 1 });
    expectRunState(["inc R0", "dec R0"], [], { r_R0: 0, r_PC: 2 });
    expectRunState(["dec R0", "inc R0"], [], { r_R0: 0, r_PC: 2 });

    // If
    expectRunState(["if R0 10 20"], [], { r_R0: 0, r_PC: 10 });
    expectRunState(["inc R0", "if R0 10 20"], [], { r_R0: 1, r_PC: 20 });
    expectRunState(["dec R0", "if R0 10 20"], [], { r_R0: 255, r_PC: 20 });
    expectRunState(["inc R1", "if R0 10 20"], [], { r_R0: 0, r_R1: 1, r_PC: 10 });

    // Halt
    expectRunState(["hlt", "inc R0"], [], { isRunning: false, r_R0: 0, r_PC: 1 });
  });

});

describe("Reg: Disassembler", () => {

  test("instructions: should include correct arguments in one string", () => {
    expectInstructionStrings(["inc R0", "hlt"], ["INC R0", "HLT"]);
    expectInstructionStrings(["dec R0", "hlt"], ["DEC R0", "HLT"]);
    expectInstructionStrings(["if R0 10 20", "hlt"], ["IF R0 10 20", "", "", "HLT"]);
  });

  test("registers: should be interpreted correctly", () => {
    expectInstructionStrings(["inc R0", "hlt"], ["INC R0", "HLT"]);
    expectInstructionStrings(["inc R63", "hlt"], ["INC R63", "HLT"]);
  });

});
