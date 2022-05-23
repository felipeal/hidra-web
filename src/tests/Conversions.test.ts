import {
  addressToHex, bitPatternToUnsignedByte, asciiValueToString, codeStringToNumber, immediateValuesToNegative, instructionStringToDisplayMode, numbersToHex,
  registerValueToString, uncheckedByteStringToNumber, unsignedByteToBitPattern, unsignedByteToSigned, unsignedByteToString, unsignedNumberToHex,
  unsignedNumberToHexCodeString, unsignedWordToSigned, charToAsciiValue
} from "../core/utils/Conversions";

describe("Conversions", () => {

  test("bitPatternToUnsignedByte: should have the correct result", () => {
    expect(bitPatternToUnsignedByte("10001111")).toBe(0b10001111);
  });

  test("bitPatternToUnsignedByte: should evaluate wildcards as zero", () => {
    expect(bitPatternToUnsignedByte(".100111.")).toBe(0b01001110);
  });

  test("unsignedByteToBitPattern: should have the correct result", () => {
    expect(unsignedByteToBitPattern(0b10001111)).toBe("10001111"); // Negative
    expect(unsignedByteToBitPattern(0b00000010)).toBe("00000010"); // Padded
    expect(unsignedByteToBitPattern(0)).toBe("00000000"); // Zero
  });

  test("unsignedByteToSigned: should have the correct result", () => {
    expect(unsignedByteToSigned(0)).toBe(0);
    expect(unsignedByteToSigned(127)).toBe(127);
    expect(unsignedByteToSigned(128)).toBe(-128);
    expect(unsignedByteToSigned(255)).toBe(-1);
  });

  test("unsignedWordToSigned: should have the correct result", () => {
    expect(unsignedWordToSigned(0)).toBe(0);
    expect(unsignedWordToSigned(32767)).toBe(32767);
    expect(unsignedWordToSigned(32768)).toBe(-32768);
    expect(unsignedWordToSigned(65535)).toBe(-1);
  });

  test("codeStringToNumber: should parse both hex and dec", () => {
    expect(codeStringToNumber("128")).toBe(128); // Decimal
    expect(codeStringToNumber("-128")).toBe(-128); // Negative decimal
    expect(codeStringToNumber("0128")).toBe(128); // Decimal with zero prefix
    expect(codeStringToNumber("h10")).toBe(0x10); // Hex
    expect(codeStringToNumber("h010")).toBe(0x10); // Hex with zero prefix
    expect(codeStringToNumber("h8F")).toBe(0x8F); // Lowercase prefix with uppercase hex
    expect(codeStringToNumber("H8f")).toBe(0x8F); // Uppercase prefix with lowercase hex
  });

  test("memoryStringToNumber: should convert based on display option", () => {
    expect(uncheckedByteStringToNumber("016", { displayHex: false })).toBe(16); // Decimal
    expect(uncheckedByteStringToNumber("-016", { displayHex: false })).toBe(240); // Negative decimal
    expect(uncheckedByteStringToNumber("-ff", { displayHex: true })).toBe(1); // Negative hex
    expect(uncheckedByteStringToNumber("fA", { displayHex: true })).toBe(0xFA); // Mixed case hex
  });

  test("memoryStringToNumber: should still return a number if invalid", () => {
    expect(uncheckedByteStringToNumber("NaN", { displayHex: false })).toBe(0);
    expect(uncheckedByteStringToNumber("NaN", { displayHex: true })).toBe(0);
    expect(uncheckedByteStringToNumber("256x", { displayHex: false })).toBe(0);
    expect(uncheckedByteStringToNumber("100x", { displayHex: true })).toBe(0);
    expect(uncheckedByteStringToNumber("9".repeat(400), { displayHex: false })).toBe(0); // Decimal infinity
    expect(uncheckedByteStringToNumber("9".repeat(400), { displayHex: true })).toBe(0); // Hex infinity
  });

  test("asciiValueToString: should convert ASCII correctly", () => {
    expect(asciiValueToString(32)).toBe(" "); // First valid ASCII
    expect(asciiValueToString(126)).toBe("~"); // Last valid ASCII
  });

  test("asciiValueToString: should ignore control characters or invalid ASCII", () => {
    expect(asciiValueToString(0)).toBe("");
    expect(asciiValueToString(31)).toBe("");
    expect(asciiValueToString(127)).toBe("");
    expect(asciiValueToString(255)).toBe("");
  });

  test("charToAsciiValue: should convert to correct ASCII numbers", () => {
    expect(charToAsciiValue(" ")).toBe(32); // First valid ASCII
    expect(charToAsciiValue("~")).toBe(126); // Last valid ASCII
    expect(charToAsciiValue("A")).toBe(65);
    expect(charToAsciiValue("a")).toBe(97);
  });

  test("charToAsciiValue: should ignore control characters or invalid ASCII", () => {
    expect(charToAsciiValue("")).toBe(null); // Less than one char
    expect(charToAsciiValue("ABC")).toBe(null); // More than one char
    expect(charToAsciiValue("\t")).toBe(null); // Tab character
    expect(charToAsciiValue("€")).toBe(null); // Invalid ASCII
  });

  test("unsignedNumberToHex: should pad correctly", () => {
    expect(unsignedNumberToHex(0, 2)).toBe("00");
    expect(unsignedNumberToHex(0xFF, 2)).toBe("FF");
    expect(unsignedNumberToHex(0, 4)).toBe("0000");
    expect(unsignedNumberToHex(0xFF, 4)).toBe("00FF");
    expect(unsignedNumberToHex(0xFFFF, 2)).toBe("FFFF");
  });

  test("addressToHex: should pad correctly", () => {
    expect(addressToHex(0x0F, 256)).toBe("0F");
    expect(addressToHex(0x0F, 512)).toBe("00F");
  });

  test("numbersToHex: should convert to hex syntax", () => {
    expect(numbersToHex("ADD 255")).toBe("ADD hFF");
    expect(numbersToHex("ADD 255,I")).toBe("ADD hFF,I");
    expect(numbersToHex("ADD #255")).toBe("ADD #hFF");
    expect(numbersToHex("ABC 128 255")).toBe("ABC h80 hFF"); // Two arguments
    expect(numbersToHex("IF R10 128 255")).toBe("IF R10 h80 hFF"); // Number in register (not replaced)
  });

  test("immediateValuesToNegative: should convert only immediate values", () => {
    expect(immediateValuesToNegative("ABC #0 #127 #128 #255")).toBe("ABC #0 #127 #-128 #-1"); // Immediate values
    expect(immediateValuesToNegative("ABC 0 127 128 255")).toBe("ABC 0 127 128 255"); // Non-immediate addresses
    expect(immediateValuesToNegative("IF R10 128 #255")).toBe("IF R10 128 #-1"); // Number in register (not replaced)
  });

  test("instructionStringToDisplayMode: should convert according to mode", () => {
    expect(instructionStringToDisplayMode("ABC 0 255,PC #0 #255", {})).toBe("ABC 0 255,PC #0 #255");
    expect(instructionStringToDisplayMode("ABC 0 255,PC #0 #255", { displayHex: true })).toBe("ABC h0 hFF,PC #h0 #hFF");
    expect(instructionStringToDisplayMode("ABC 0 255,PC #0 #255", { displayNegative: true })).toBe("ABC 0 255,PC #0 #-1");
  });

  test("unsignedNumberToHexCodeString: should convert correctly", () => {
    expect(unsignedNumberToHexCodeString(0)).toBe("h0");
    expect(unsignedNumberToHexCodeString(0xF)).toBe("hF");
    expect(unsignedNumberToHexCodeString(0xF0)).toBe("hF0");
  });

  test("unsignedByteToString: should convert correctly", () => {
    // Unsigned decimal
    expect(unsignedByteToString(15, {})).toBe("15");
    expect(unsignedByteToString(128, {})).toBe("128");

    // Display negative
    expect(unsignedByteToString(15, { displayNegative: true })).toBe("15");
    expect(unsignedByteToString(128, { displayNegative: true })).toBe("-128");

    // Display hexadecimal
    expect(unsignedByteToString(15, { displayHex: true })).toBe("0F"); // 2-digit padding
    expect(unsignedByteToString(128, { displayHex: true })).toBe("80"); // 2-digit padding

    // Both options (invalid, prefer hexadecimal)
    expect(unsignedByteToString(128, { displayHex: true, displayNegative: true })).toBe("80");
  });

  test("registerValueToString: should convert correctly", () => {
    // Unsigned decimal
    expect(registerValueToString({ value: 15, numBits: 8, isData: true }, {})).toBe("15");
    expect(registerValueToString({ value: 128, numBits: 8, isData: true }, {})).toBe("128");

    // Display negative (signed for data registers)
    expect(registerValueToString({ value: 31, numBits: 6, isData: true }, { displayNegative: true })).toBe("31");
    expect(registerValueToString({ value: 32, numBits: 6, isData: true }, { displayNegative: true })).toBe("-32");
    expect(registerValueToString({ value: 32, numBits: 6, isData: false }, { displayNegative: true })).toBe("32");

    // Display hexadecimal
    expect(registerValueToString({ value: 128, numBits: 8, isData: true }, { displayHex: true })).toBe("80");
    expect(registerValueToString({ value: 128, numBits: 9, isData: true }, { displayHex: true })).toBe("080");

    // Both options (invalid, prefer hexadecimal)
    expect(registerValueToString({ value: 128, numBits: 8, isData: true }, { displayNegative: true, displayHex: true })).toBe("80");
  });

});
