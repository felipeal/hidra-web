import { } from "./TestUtils";
import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/Errors";
import { Texts } from "../core/Texts";
import { Ramses } from "../machines/Ramses";

const machine = new Ramses();
const assembler = new Assembler(machine);

function expectSuccess(line: string, memory: number[]) {
  expect(assembler.build(line)).toDeepEqual([], line);
  for (let i = 0; i < memory.length; i++) {
    expect(machine.getMemoryValue(i)).toDeepEqual(memory[i], line);
  }
}

function expectError(line: string, errorCode: AssemblerErrorCode, lineNumber = 1) {
  expect(assembler.build(line)).toDeepEqual([Texts.buildErrorMessage(lineNumber - 1, errorCode)], line);
}

describe("Transformations", () => {

  test("removeComments: should handle basic scenarios", () => {
    expect(assembler["removeComment"]("code")).toBe("code");
    expect(assembler["removeComment"]("code ; comment")).toBe("code ");
    expect(assembler["removeComment"]("code ;; comment")).toBe("code ");
    expect(assembler["removeComment"]("code;comment")).toBe("code");
    expect(assembler["removeComment"]("code;comment;comment")).toBe("code");
  });

  test("removeComments: should ignore comments inside strings", () => {
    expect(assembler["removeComment"]("code ';code' ; comment")).toBe("code ';code' ");
    expect(assembler["removeComment"]("code ';code' ';code' ; comment")).toBe("code ';code' ';code' ");
  });

  test("removeComments: should replace the correct part of the string", () => {
    expect(assembler["removeComment"]("abc ';test' ;test")).toBe("abc ';test' ");
  });

  test("removeComments: should replace the correct part of the string", () => {
    expect(assembler["removeComment"]("abc ';test' ;test")).toBe("abc ';test' ");
  });

  test("removeComments: should replace the correct part of the string", () => {
    expect(assembler["removeComment"]("abc ';test' ;test")).toBe("abc ';test' ");
  });

});

describe("Validations", () => {

  test("isValidValue: should validate range", () => {
    expect(assembler["isValidValue"]("0", -10, 10)).toBe(true);
    expect(assembler["isValidValue"]("-10", -10, 10)).toBe(true);
    expect(assembler["isValidValue"]("10", -10, 10)).toBe(true);
    expect(assembler["isValidValue"]("-11", -10, 10)).toBe(false);
    expect(assembler["isValidValue"]("11", -10, 10)).toBe(false);
  });

  test("isValidValue: should reject invalid characters", () => {
    expect(assembler["isValidValue"]("0.1", -10, 10)).toBe(false);
    expect(assembler["isValidValue"]("H0.1", -10, 10)).toBe(false);
    expect(assembler["isValidValue"]("-1", -10, 10)).toBe(true);
    expect(assembler["isValidValue"]("1-", -10, 160)).toBe(false);
  });

  test("isValidValue: should handle hexadecimal numbers", () => {
    expect(assembler["isValidValue"]("hF0", 0, 240)).toBe(true);
    expect(assembler["isValidValue"]("Hf0", 0, 240)).toBe(true); // Inverted case
    expect(assembler["isValidValue"]("h0G", 0, 240)).toBe(false);
    expect(assembler["isValidValue"]("0F", 0, 240)).toBe(false); // No prefix
  });

  test("isValidNBytesValue: should handle hexadecimal numbers", () => {
    // 1 byte
    expect(assembler["isValidNBytesValue"](String(-0x80), 1)).toBe(true);
    expect(assembler["isValidNBytesValue"](String(-0x81), 1)).toBe(false);
    expect(assembler["isValidNBytesValue"](String(0xFF), 1)).toBe(true);
    expect(assembler["isValidNBytesValue"](String(0x100), 1)).toBe(false);

    // 2 bytes
    expect(assembler["isValidNBytesValue"](String(-0x8000), 2)).toBe(true);
    expect(assembler["isValidNBytesValue"](String(-0x8001), 2)).toBe(false);
    expect(assembler["isValidNBytesValue"](String(0xFFFF), 2)).toBe(true);
    expect(assembler["isValidNBytesValue"](String(0x10000), 2)).toBe(false);

    // Other N values
    expect(() => assembler["isValidNBytesValue"]("0", 3)).toThrow();
  });

});

describe("Build", () => {

  test("build: should ignore whitespace", () => {
    expectSuccess(" ADD A 0 ; 1", [48, 0]);
    expectSuccess(" Label: ADD A 0 ; 1", [48, 0]);
  });

  test("build: should be case-insensitive", () => {
    expectSuccess("ADD A 0", [48, 0]);
    expectSuccess("add a 0", [48, 0]);
    expectSuccess("LABEL: ADD A label", [48, 0]);
  });

  test("build: should validate instructions", () => {
    expectSuccess("HLT", [240]);
    expectError("NOPX", AssemblerErrorCode.INVALID_INSTRUCTION);
    expectError("XNOP", AssemblerErrorCode.INVALID_INSTRUCTION);
  });

  test("build: should validate number of arguments for instructions", () => {
    expectSuccess("ADD A 0", [48, 0]);
    expectError("ADD A 0 1", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
    expectError("ADD A", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
    expectError("HLT 0", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS);
  });

  test("build: should validate arguments", () => {
    expectError("JMP 256", AssemblerErrorCode.INVALID_ADDRESS);
    expectError("JMP %", AssemblerErrorCode.INVALID_ARGUMENT);
  });

  test("build: should validate memory overlap", () => {
    expectError("JMP 128\nORG 1\nDB 0", AssemblerErrorCode.MEMORY_OVERLAP, 3);
  });

});

describe("Labels", () => {

  test("should validate label format", () => {
    expectSuccess("Label:", []);
    expectSuccess("Label: DB 1", [1]);
    expectSuccess("Label:\nDB 1", [1]);
    expectSuccess(" Label:\nDB 1", [1]);
    expectSuccess("_: DB 1", [1]);
    expectError(": DB 1", AssemblerErrorCode.INVALID_LABEL); // Empty label
    expectError("La bel: DB 1", AssemblerErrorCode.INVALID_LABEL); // Space inside label
    expectError("Label :\nDB 1", AssemblerErrorCode.INVALID_LABEL); // Space before colon
    expectError("1: DB 1", AssemblerErrorCode.INVALID_LABEL); // Starting with number
  });

  test("should validate label's existence", () => {
    expectSuccess("Label1: JMP Label1", [128, 0]);
    expectError("Label1: JMP Label2", AssemblerErrorCode.INVALID_LABEL);
  });

  test("should reject duplicate labels", () => {
    expectSuccess("Label1:\nLabel2:\nDB 1", [1]);
    expectError("Label:\nLabel:", AssemblerErrorCode.DUPLICATE_LABEL, 2);
    expectError("LABEL:\nlabel:", AssemblerErrorCode.DUPLICATE_LABEL, 2); // Case-insensitive
  });

});

describe("Directives", () => {

  test("ORG: should accept all valid usages", () => {
    expectSuccess("ORG 1\nDB 1", [0, 1]);
    expectSuccess("ORG 255", []); // Upper bound
    expectSuccess("ORG hFF", []); // Hexadecimal
    expectError("ORG -1", AssemblerErrorCode.INVALID_ADDRESS); // Out of bounds
    expectError("ORG", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Missing argument
    expectError("ORG 1 2", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Extra arguments
    expectError("ORG 256", AssemblerErrorCode.INVALID_ADDRESS);
    expectError("ORG h100", AssemblerErrorCode.INVALID_ADDRESS);
  });

  test("DB: should accept all valid usages", () => {
    expectSuccess("DB 1", [1]); // Number argument
    expectSuccess("DB\nDB 1", [0, 1]); // No argument: defaults to zero
    expectSuccess("DB '0'", [48]); // Single character
    expectSuccess("DB '''", [39]); // Single quote character
    expectSuccess("DB -128", [128]); // Lower bound (two's complement)
    expectSuccess("DB 255", [255]); // Upper bound
    expectSuccess("DB hFF", [255]); // Hexadecimal
    expectError("DB -129", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DB 256", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DB 1 2", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Extra arguments
    expectError("DB [2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate syntax: invalid
    expectError("DB '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DW '012'", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Multiple characters: invalid
    expectError("DB %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DW: should accept all valid usages", () => {
    expectSuccess("DW 1", [0, 1]); // Number argument (big-endian)
    expectSuccess("DW\nDB 1", [0, 0, 1]); // No argument: defaults to zero
    expectSuccess("DW '0'", [0, 48]); // Single character
    expectSuccess("DW '''", [0, 39]); // Single quote character
    expectSuccess("DW -32768", [128, 0]); // Lower bound
    expectSuccess("DW 65535", [255, 255]); // Upper bound
    expectError("DW -32769", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DW 65536", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DW 1 2", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Extra arguments
    expectError("DW [2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate syntax: invalid
    expectError("DW '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DW '012'", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // Multiple characters: invalid
    expectError("DW %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DAB: should accept all valid usages", () => {
    expectSuccess("DAB 1", [1]); // Number argument
    expectSuccess("DAB hFF", [255]); // Hexadecimal
    expectSuccess("DAB '0'", [48]); // Single character
    expectSuccess("DAB '''", [39]); // Single quote character
    expectSuccess("DAB '012'", [48, 49, 50]); // String
    expectSuccess("DAB 1, 2, 3", [1, 2, 3]); // Multiple arguments (commas)
    expectSuccess("DAB 1 2 3", [1, 2, 3]); // Multiple arguments (spaces)
    expectSuccess("DAB '0', '12', 3, h4, '''", [48, 49, 50, 3, 4, 39]); // Mixed formats (commas)
    expectSuccess("DAB '0' '12' 3 h4 '''", [48, 49, 50, 3, 4, 39]); // Mixed formats (commas)
    expectSuccess("DAB ''''0'''0''''", [39, 48, 39, 48, 39]); // String with escaped single quotes
    expectSuccess("DAB [2]\nDB 1", [0, 0, 1]); // Allocate only
    expectSuccess("DAB -128", [128]); // Lower bound
    expectSuccess("DAB 255", [255]); // Upper bound
    expectError("DAB 0, -129, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAB 0, 256, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAB", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // No argument: invalid
    expectError("DAB ''", AssemblerErrorCode.INVALID_STRING); // Empty string
    expectError("DAB '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DAB %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DAW: should accept all valid usages", () => {
    expectSuccess("DAW 1", [0, 1]); // Number argument
    expectSuccess("DAW hFF", [0, 255]); // Hexadecimal
    expectSuccess("DAW '0'", [0, 48]); // Single character
    expectSuccess("DAW '''", [0, 39]); // Single quote character
    expectSuccess("DAW '012'", [0, 48, 0, 49, 0, 50]); // String
    expectSuccess("DAW 1, 2, 3", [0, 1, 0, 2, 0, 3]); // Multiple arguments (commas)
    expectSuccess("DAW 1 2 3", [0, 1, 0, 2, 0, 3]); // Multiple arguments (spaces)
    expectSuccess("DAW '0', '12', 3, h4, '''", [0, 48, 0, 49, 0, 50, 0, 3, 0, 4, 0, 39]); // Mixed formats (commas)
    expectSuccess("DAW '0' '12' 3 h4 '''", [0, 48, 0, 49, 0, 50, 0, 3, 0, 4, 0, 39]); // Mixed formats (commas)
    expectSuccess("DAW ''''0'''0''''", [0, 39, 0, 48, 0, 39, 0, 48, 0, 39]); // String with escaped single quotes
    expectSuccess("DAW [2]\nDB 1", [0, 0, 0, 0, 1]); // Allocate only
    expectSuccess("DAW -32768", [128, 0]); // Lower bound
    expectSuccess("DAW 65535", [255, 255]); // Upper bound
    expectError("DAW 0, -32769, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAW 0, 65536, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAW", AssemblerErrorCode.WRONG_NUMBER_OF_ARGUMENTS); // No argument: invalid
    expectError("DAW ''", AssemblerErrorCode.INVALID_STRING); // Empty string
    expectError("DAW '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DAW %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

});
