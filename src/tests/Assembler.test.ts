import { Assembler } from "../core/Assembler";
import { AssemblerErrorCode } from "../core/AssemblerError";
import { Ramses } from "../core/machines/Ramses";
import { makeFunction_expectBuildError, makeFunction_expectBuildSuccess } from "./utils/MachineTestFunctions";

const machine = new Ramses();
const assembler = new Assembler(machine);

const expectSuccess = makeFunction_expectBuildSuccess(assembler, machine);
const expectError = makeFunction_expectBuildError(assembler);

describe("Assembler: Transformations", () => {

  test("removeComments: should handle basic scenarios", () => {
    expect(assembler["removeComment"]("code")).toBe("code");
    expect(assembler["removeComment"]("code ; comment")).toBe("code ");
    expect(assembler["removeComment"]("code ;; comment")).toBe("code ");
    expect(assembler["removeComment"]("code;comment")).toBe("code");
    expect(assembler["removeComment"]("code;comment;comment")).toBe("code");
    expect(assembler["removeComment"]("\tcode\t;comment")).toBe("\tcode\t");
  });

  test("removeComments: should ignore comments inside strings", () => {
    expect(assembler["removeComment"]("code ';code' ; comment")).toBe("code ';code' ");
    expect(assembler["removeComment"]("code ';code' ';code' ; comment")).toBe("code ';code' ';code' ");
  });

  test("removeComments: should properly handle mixed strings and comments edge cases", () => {
    expect(assembler["removeComment"]("code '")).toBe("code '");
    expect(assembler["removeComment"]("code ';")).toBe("code ';");
    expect(assembler["removeComment"]("''''code'''code'''' ;'''")).toBe("''''code'''code'''' ");
    expect(assembler["removeComment"]("''''' ;'")).toBe("''''' ");
    expect(assembler["removeComment"]("''''' ';' ;'")).toBe("''''' ';' ");
    expect(assembler["removeComment"]("''''' ';' ;'")).toBe("''''' ';' ");
    expect(assembler["removeComment"]("'123';")).toBe("'123'");
    expect(assembler["removeComment"]("'''';''';'''';'")).toBe("'''';''';''''");
    expect(assembler["removeComment"]("'''''\t;")).toBe("'''''\t");
    expect(assembler["removeComment"]("'''''\t;")).toBe("'''''\t");
  });

  test("removeComments: should replace the correct part of the string", () => {
    expect(assembler["removeComment"]("abc ';test' ;test")).toBe("abc ';test' ");
  });

});

describe("Assembler: Validations", () => {

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

describe("Assembler: Build", () => {

  test("build: should ignore whitespace", () => {
    expectSuccess(" ADD A 0 ; 1", [48, 0]);
    expectSuccess(" Label: ADD A 0 ; 1", [48, 0]);
    expectSuccess("\tLabel:\tADD\tA\t0\t;\t1", [48, 0]);
  });

  test("build: should be case-insensitive", () => {
    expectSuccess("ADD A 0,I", [49, 0]);
    expectSuccess("add a 0,i", [49, 0]);
    expectSuccess("LABEL: ADD A label", [48, 0]);
  });

  test("build: should validate instructions", () => {
    expectSuccess("HLT", [240]);
    expectError("NOPX", AssemblerErrorCode.INVALID_MNEMONIC);
    expectError("XNOP", AssemblerErrorCode.INVALID_MNEMONIC);
  });

  test("build: should validate number of arguments for instructions", () => {
    expectSuccess("ADD A 0", [48, 0]);
    expectSuccess("ADD   A   0  ", [48, 0]);
    expectError("ADD A 0 1", AssemblerErrorCode.TOO_MANY_ARGUMENTS);
    expectError("ADD A", AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    expectError("HLT 0", AssemblerErrorCode.TOO_MANY_ARGUMENTS);
  });

  test("build: should validate arguments", () => {
    expectError("JMP 256", AssemblerErrorCode.INVALID_ADDRESS);
    expectError("JMP %", AssemblerErrorCode.INVALID_ARGUMENT);
  });

  test("build: should validate memory overlap", () => {
    expectError("JMP 128\nORG 1\nDB 0", AssemblerErrorCode.MEMORY_OVERLAP, 3);
    expectError("ORG 1\nADD A 0\nORG 0\nADD A 0", AssemblerErrorCode.MEMORY_OVERLAP, 4); // Overlap on second byte only
  });

  test("build: should validate memory exceeded", () => {
    expectSuccess("ORG 255\nHLT", [0]); // Instruction ends inside memory
    expectSuccess("ORG 255\nHLT\n;", [0]); // New lines after the last instruction
    expectError("ORG 255\nADD A 0", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Instruction ends outside memory
    expectError("ORG 254\nDAW 1, 2", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Word starts outside memory
    expectError("ORG 253\nDAW 1, 2", AssemblerErrorCode.MEMORY_LIMIT_EXCEEDED, 2); // Word ends outside memory
  });

  test("build: should allow immediate chars", () => {
    expectSuccess("ADD A #'0'", [50, 48]); // Number
    expectSuccess("ADD A #'a'", [50, 97]); // Lowercase
    expectSuccess("ADD A #'A'", [50, 65]); // Uppercase
    expectSuccess("ADD A #'''", [50, 39]); // Literal single quote
    expectSuccess("ADD A #Label\nLabel: DB 10", [50, 2, 10]); // Immediate label
    expectSuccess("ADD A #Label+1\nLabel: DB 10", [50, 3, 10]); // Immediate label with offset
  });

  test("build: should return multiple first pass errors", () => {
    const firstPassErrors = assembler.build("NOPX\nORG 512");
    expect(firstPassErrors).toEqual([
      { errorCode: AssemblerErrorCode.INVALID_MNEMONIC, lineNumber: 1 },
      { errorCode: AssemblerErrorCode.INVALID_ADDRESS, lineNumber: 2 }
    ]);
  });

  test("build: should return multiple second pass errors", () => {
    const secondPassErrors = assembler.build("ADD A 512\nADD Z 0");
    expect(secondPassErrors).toEqual([
      { errorCode: AssemblerErrorCode.INVALID_ADDRESS, lineNumber: 1 },
      { errorCode: AssemblerErrorCode.INVALID_ARGUMENT, lineNumber: 2 }
    ]);
  });

});

describe("Assembler: Labels", () => {

  test("should validate label format", () => {
    expectSuccess("Label:", []);
    expectSuccess("Label: DB 1", [1]);
    expectSuccess("Label:\nDB 1", [1]);
    expectSuccess(" Label:\nDB 1", [1]);
    expectSuccess("_: DB 1", [1]);
    expectError("1: DB 1", AssemblerErrorCode.INVALID_LABEL); // Starting with number
    expectError("Label :\nDB 1", AssemblerErrorCode.INVALID_MNEMONIC); // Space before colon
    expectError(": DB 1", AssemblerErrorCode.INVALID_MNEMONIC); // Empty label
    expectError("La bel: DB 1", AssemblerErrorCode.INVALID_MNEMONIC); // Space inside label
  });

  test("should validate label's existence", () => {
    expectSuccess("Label1: JMP Label1", [128, 0]);
    expectError("Label1: JMP Label2", AssemblerErrorCode.INVALID_LABEL);
    expectError("DB Label", AssemblerErrorCode.INVALID_ARGUMENT); // Label in directive
    expectError("JMP Label+1", AssemblerErrorCode.INVALID_LABEL); // Label with offset
  });

  test("should validate offsets", () => {
    expectSuccess("JMP Label-1\nLabel: DB 32", [128, 1, 32]);
    expectSuccess("JMP Label+1\nLabel: DB 32", [128, 3, 32]);
    expectError("Label: JMP 1+Label", AssemblerErrorCode.INVALID_ARGUMENT);
    expectError("Label: JMP Label+Label", AssemblerErrorCode.INVALID_ARGUMENT);
  });

  test("should reject duplicate labels", () => {
    expectSuccess("Label1:\nLabel2:\nDB 1", [1]);
    expectError("Label:\nLabel:", AssemblerErrorCode.DUPLICATE_LABEL, 2);
    expectError("LABEL:\nlabel:", AssemblerErrorCode.DUPLICATE_LABEL, 2); // Case-insensitive duplicate
  });

  test("should correctly follow ORG directive", () => {
    expectSuccess("Label: ORG 2\nDB Label", [0, 0, 0]); // Label before ORG
    expectSuccess("Label: ORG 2\nJMP Label", [0, 0, 128, 0]); // Label before ORG
    expectSuccess("ORG 2\nLabel: DB Label", [0, 0, 2]); // Label after ORG
    expectSuccess("ORG 2\nLabel: JMP Label", [0, 0, 128, 2]); // Label after ORG
  });

  test("should parse correctly", () => {
    expectSuccess("L: DAB 'L:'", [76, 58]); // Label repeated inside string
  });

  test("should reject labels that match reserved keywords", () => {
    expectError("nop:", AssemblerErrorCode.RESERVED_KEYWORD); // Lowercase
    expectError("NOP:", AssemblerErrorCode.RESERVED_KEYWORD); // Uppercase
    expectError("nOp:", AssemblerErrorCode.RESERVED_KEYWORD); // Mixed case
    expectSuccess("nopx:", []); // Prefix match (allowed)
    expectSuccess("xnop:", []); // Suffix match (allowed)
  });

  test("should reject labels that match hex syntax", () => {
    // Note: Daedalus allows labels with hex syntax but interprets these as hex numbers
    expectError("h:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Prefix only
    expectError("h0:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Prefix with number
    expectError("h00000000:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Prefix with multiple numbers
    expectError("h09afAF:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Prefix with mixed formats
    expectError("ha:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Lowercase
    expectError("HA:", AssemblerErrorCode.RESERVED_HEX_SYNTAX); // Uppercase
    expectSuccess("h1G:", []); // Prefix match (allowed)
    expectSuccess("aH0:", []); // Suffix match (allowed)
  });

});

describe("Assembler: Directives", () => {

  test("ORG: should accept all valid usages", () => {
    expectSuccess("ORG 1\nDB 1", [0, 1]);
    expectSuccess("ORG 255", []); // Upper bound
    expectSuccess("ORG hFF", []); // Hexadecimal
    expectError("ORG -1", AssemblerErrorCode.INVALID_ADDRESS); // Out of bounds
    expectError("ORG", AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    expectError("ORG  ;  ", AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    expectError("ORG 1 2", AssemblerErrorCode.TOO_MANY_ARGUMENTS);
    expectError("ORG 256", AssemblerErrorCode.INVALID_ADDRESS);
    expectError("ORG h100", AssemblerErrorCode.INVALID_ADDRESS);
    expectError("Label: DB 10\nORG Label", AssemblerErrorCode.INVALID_ADDRESS, 2); // Labels not allowed
  });

  test("DB: should accept all valid usages", () => {
    expectSuccess("DB 1", [1]); // Number argument
    expectSuccess("DB\nDB 1", [0, 1]); // No argument: defaults to zero
    expectSuccess("DB '0'", [48]); // Single character
    expectSuccess("DB '''", [39]); // Single quote character
    expectSuccess("DB '~'", [126]); // Last valid ASCII char
    expectSuccess("ORG 1\nLabel: DB Label", [0, 1]); // Label
    expectSuccess("ORG 1\nLabel: DB Label+1", [0, 2]); // Label with offset
    expectSuccess("DB 1 , \nDB 2,", [1, 2]); // Trailing separator (currently allowed)
    expectSuccess("DB hFF", [255]); // Hexadecimal
    expectSuccess("DB -128", [128]); // Lower bound
    expectSuccess("DB 255", [255]); // Upper bound
    expectSuccess("DB A128-256\nORG 128\nA128: DB", [128]); // Lower bound with offset
    expectSuccess("DB A128+127\nORG 128\nA128: DB", [255]); // Upper bound with offset
    expectError("DB -129", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DB 256", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("Zero: DB Zero-129", AssemblerErrorCode.INVALID_VALUE); // Out of bounds with offset
    expectError("Zero: DB Zero+256", AssemblerErrorCode.INVALID_VALUE); // Out of bounds with offset
    expectError("DB 1 2", AssemblerErrorCode.TOO_MANY_ARGUMENTS); // Extra arguments
    expectError("DB ,", AssemblerErrorCode.INVALID_ARGUMENT); // Separator only
    expectError("DB [2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate syntax: invalid
    expectError("DB '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DB 'ã'", AssemblerErrorCode.INVALID_CHARACTER); // Non-ASCII character
    expectError("DB '\t'", AssemblerErrorCode.INVALID_CHARACTER); // Tab character (currently not allowed)
    expectError("DB '012'", AssemblerErrorCode.TOO_MANY_ARGUMENTS); // Multiple characters: invalid
    expectError("DB %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DW: should accept all valid usages", () => {
    expectSuccess("DW 1", [0, 1]); // Number argument (big-endian)
    expectSuccess("DW\nDB 1", [0, 0, 1]); // No argument: defaults to zero
    expectSuccess("DW '0'", [0, 48]); // Single character
    expectSuccess("DW '''", [0, 39]); // Single quote character
    expectSuccess("DW '~'", [0, 126]); // Last valid ASCII char
    expectSuccess("ORG 1\nLabel: DW Label", [0, 0, 1]); // Label
    expectSuccess("ORG 1\nLabel: DW Label+1", [0, 0, 2]); // Label with offset
    expectSuccess("DW 1 , \nDW 2,", [0, 1, 0, 2]); // Trailing separator (currently allowed)
    expectSuccess("DW hFF", [0, 255]); // Hexadecimal
    expectSuccess("DW -32768", [128, 0]); // Lower bound
    expectSuccess("DW 65535", [255, 255]); // Upper bound
    expectSuccess("DW A2-32770\nA2: DB", [128, 0]); // Lower bound with offset
    expectSuccess("DW A2+65533\nA2: DB", [255, 255]); // Upper bound with offset
    expectError("DW -32769", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DW 65536", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("Zero: DW Zero-32769", AssemblerErrorCode.INVALID_VALUE); // Out of bounds with offset
    expectError("Zero: DW Zero+65536", AssemblerErrorCode.INVALID_VALUE); // Out of bounds with offset
    expectError("DW 1 2", AssemblerErrorCode.TOO_MANY_ARGUMENTS); // Extra arguments
    expectError("DW ,", AssemblerErrorCode.INVALID_ARGUMENT); // Separator only
    expectError("DW a", AssemblerErrorCode.INVALID_ARGUMENT); // Invalid argument
    expectError("DW [2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate syntax: invalid
    expectError("DW '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DW 'ã'", AssemblerErrorCode.INVALID_CHARACTER); // Non-ASCII character
    expectError("DW '\t'", AssemblerErrorCode.INVALID_CHARACTER); // Tab character (currently not allowed)
    expectError("DW '012'", AssemblerErrorCode.TOO_MANY_ARGUMENTS); // Multiple characters: invalid
    expectError("DW %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DAB: should accept all valid usages", () => {
    expectSuccess("DAB 1", [1]); // Number argument
    expectSuccess("DAB hFF", [255]); // Hexadecimal
    expectSuccess("DAB '0'", [48]); // Single character
    expectSuccess("DAB '''", [39]); // Single quote character
    expectSuccess("DAB '012'", [48, 49, 50]); // String
    expectSuccess("DAB 1 2 3", [1, 2, 3]); // Multiple arguments (spaces)
    expectSuccess("DAB 1,2,3", [1, 2, 3]); // Multiple arguments (commas)
    expectSuccess("DAB 1,  2  ,3  ,  4", [1, 2, 3, 4]); // Multiple arguments (commas+spaces)
    expectSuccess("DAB 1,\t2\t,3\t,\t4", [1, 2, 3, 4]); // Multiple arguments (commas+tabs)
    expectSuccess("DAB 1 \t2\t 3\t \t4", [1, 2, 3, 4]); // Multiple arguments (spaces+tabs)
    expectSuccess("DAB '0', '12', 3, h4, '''", [48, 49, 50, 3, 4, 39]); // Mixed formats (commas)
    expectSuccess("DAB '0' '12' 3 h4 '''", [48, 49, 50, 3, 4, 39]); // Mixed formats (spaces)
    expectSuccess("DAB\t'0'\t'12'\t3\th4\t'''", [48, 49, 50, 3, 4, 39]); // Mixed formats (tabs)
    expectSuccess("DAB ''''0'''0''''", [39, 48, 39, 48, 39]); // String with escaped single quotes
    expectSuccess("DAB '1-1'", [49, 45, 49]); // String with hyphen
    expectSuccess("DAB '1:1'", [49, 58, 49]); // String with colon
    expectSuccess("DAB '1  1'", [49, 32, 32, 49]); // String with multiple spaces
    expectSuccess("DAB 'Aa'", [65, 97]); // String with mixed case
    expectSuccess("DAB [2]\nDB 1", [0, 0, 1]); // Allocate only
    expectSuccess("DAB -128", [128]); // Lower bound
    expectSuccess("DAB 255", [255]); // Upper bound
    expectError("DAB 0, -129, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAB 0, 256, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAB", AssemblerErrorCode.TOO_FEW_ARGUMENTS); // No argument
    expectError("DAB [h2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate hex
    expectError("DAB ''", AssemblerErrorCode.INVALID_STRING); // Empty string
    expectError("DAB '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("DAB 1,, 2", AssemblerErrorCode.INVALID_SEPARATOR); // Invalid comma usage
    expectError("Label: DAB Label", AssemblerErrorCode.LABEL_NOT_ALLOWED); // Label
    expectError("Label: DAB Label+1", AssemblerErrorCode.LABEL_NOT_ALLOWED); // Label with offset
    expectError("DAB %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

  test("DAW: should accept all valid usages", () => {
    expectSuccess("DAW 1", [0, 1]); // Number argument
    expectSuccess("DAW hFF", [0, 255]); // Hexadecimal
    expectSuccess("DAW '0'", [0, 48]); // Single character
    expectSuccess("DAW '''", [0, 39]); // Single quote character
    expectSuccess("DAW '012'", [0, 48, 0, 49, 0, 50]); // String
    expectSuccess("DAW 1 2 3", [0, 1, 0, 2, 0, 3]); // Multiple arguments (spaces)
    expectSuccess("DAW 1,2,3", [0, 1, 0, 2, 0, 3]); // Multiple arguments (commas)
    expectSuccess("DAW 1,  2  ,3  ,  4", [0, 1, 0, 2, 0, 3, 0, 4]); // Multiple arguments (commas+spaces)
    expectSuccess("DAW 1,\t2\t,3\t,\t4", [0, 1, 0, 2, 0, 3, 0, 4]); // Multiple arguments (commas+tabs)
    expectSuccess("DAW 1 \t2\t 3\t \t4", [0, 1, 0, 2, 0, 3, 0, 4]); // Multiple arguments (spaces+tabs)
    expectSuccess("DAW '0', '12', 3, h4, '''", [0, 48, 0, 49, 0, 50, 0, 3, 0, 4, 0, 39]); // Mixed formats (commas)
    expectSuccess("DAW '0' '12' 3 h4 '''", [0, 48, 0, 49, 0, 50, 0, 3, 0, 4, 0, 39]); // Mixed formats (spaces)
    expectSuccess("DAW\t'0'\t'12'\t3\th4\t'''", [0, 48, 0, 49, 0, 50, 0, 3, 0, 4, 0, 39]); // Mixed formats (tabs)
    expectSuccess("DAW ''''0'''0''''", [0, 39, 0, 48, 0, 39, 0, 48, 0, 39]); // String with escaped single quotes
    expectSuccess("DAW '1-1'", [0, 49, 0, 45, 0, 49]); // String with hyphen
    expectSuccess("DAW '1:1'", [0, 49, 0, 58, 0, 49]); // String with colon
    expectSuccess("DAW '1  1'", [0, 49, 0, 32, 0, 32, 0, 49]); // String with multiple spaces
    expectSuccess("DAW 'Aa'", [0, 65, 0, 97]); // String with mixed case
    expectSuccess("DAW [2]\nDB 1", [0, 0, 0, 0, 1]); // Allocate only
    expectSuccess("DAW -32768", [128, 0]); // Lower bound
    expectSuccess("DAW 65535", [255, 255]); // Upper bound
    expectError("DAW 0, -32769, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAW 0, 65536, 2", AssemblerErrorCode.INVALID_VALUE); // Out of bounds
    expectError("DAW", AssemblerErrorCode.TOO_FEW_ARGUMENTS); // No argument
    expectError("DAW [h2]", AssemblerErrorCode.INVALID_ARGUMENT); // Allocate hex
    expectError("DAW ''", AssemblerErrorCode.INVALID_STRING); // Empty string
    expectError("DAW '0''", AssemblerErrorCode.INVALID_STRING); // Malformed string
    expectError("Label: DAW Label", AssemblerErrorCode.LABEL_NOT_ALLOWED); // Label
    expectError("Label: DAW Label+1", AssemblerErrorCode.LABEL_NOT_ALLOWED); // Label with offset
    expectError("DAW %", AssemblerErrorCode.INVALID_ARGUMENT); // Unexpected argument
  });

});

describe("Assembler: Accessors", () => {

  test("getFirstErrorLine: should report correct line", () => {
    assembler.build("\nNOPX\nORG 512");
    expect(assembler.getFirstErrorLine()).toEqual(1);
  });

  test("should correctly map memory and source code", () => {
    assembler.build("\nSecondLine: ADD A 0\nADD A 0");

    expect(assembler.getAddressCorrespondingSourceLine(2)).toEqual(2); // First byte
    expect(assembler.getAddressCorrespondingSourceLine(3)).toEqual(2); // Second byte
    expect(assembler.getAddressCorrespondingSourceLine(4)).toEqual(-1); // No corresponding source line

    expect(assembler.getSourceLineCorrespondingAddress(2)).toEqual(2);
    expect(assembler.getSourceLineCorrespondingAddress(3)).toEqual(-1); // No corresponding address

    expect(assembler.getAddressCorrespondingLabel(0)).toEqual("SecondLine");
    expect(assembler.getAddressCorrespondingLabel(1)).toEqual(""); // No corresponding address
    expect(assembler.getAddressCorrespondingLabel(2)).toEqual(""); // No label
  });

  test("should invalidate mappers on build failure", () => {
    assembler.build("Label: ADD A 0");
    expect(assembler.getAddressCorrespondingSourceLine(0)).toEqual(0);
    expect(assembler.getSourceLineCorrespondingAddress(0)).toEqual(0);
    expect(assembler.getAddressCorrespondingLabel(0)).toEqual("Label");
    expect(assembler.getPCCorrespondingSourceLine()).toEqual(0);

    assembler.build("Label: NOPX");
    expect(assembler.getAddressCorrespondingSourceLine(0)).toEqual(-1);
    expect(assembler.getSourceLineCorrespondingAddress(1)).toEqual(-1);
    expect(assembler.getAddressCorrespondingLabel(0)).toEqual("");
    expect(assembler.getPCCorrespondingSourceLine()).toEqual(-1);
  });

  test("getPCCorrespondingSourceLine: should report correct line", () => {
    assembler.build("\nADD A 0\nADD A 0");
    machine.setPCValue(2);
    expect(assembler.getPCCorrespondingSourceLine()).toEqual(2);
    machine.setPCValue(4);
    expect(assembler.getPCCorrespondingSourceLine()).toEqual(-1);
  });

});
