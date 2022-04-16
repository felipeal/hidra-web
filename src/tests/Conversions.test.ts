import { addressToHex, bitPatternToUnsignedByte, charCodeToString, codeStringToNumber, instructionStringToHex,
  uncheckedByteStringToNumber, unsignedNumberToHex, unsignedByteToBitPattern, unsignedByteToSigned,
  unsignedNumberToHexCodeString, unsignedByteToString, registerValueToString } from "../core/utils/Conversions";

describe("Conversions", () => {

  test("bitPatternToUnsignedByte: should have the correct result", () => {
    expect(bitPatternToUnsignedByte("10001111")).toBe(0b10001111);
  });

  test("bitPatternToUnsignedByte: should evaluate wildcards as zero", () => {
    expect(bitPatternToUnsignedByte(".100111.")).toBe(0b01001110);
  });

  test("unsignedByteToBitPattern: should have the correct result", () => {
    expect(unsignedByteToBitPattern(0b10001111)).toBe("10001111");
  });

  test("unsignedByteToSigned: should have the correct result", () => {
    expect(unsignedByteToSigned(0)).toBe(0);
    expect(unsignedByteToSigned(127)).toBe(127);
    expect(unsignedByteToSigned(128)).toBe(-128);
    expect(unsignedByteToSigned(255)).toBe(-1);
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

  test("charCodeToString: should convert ASCII correctly", () => {
    expect(charCodeToString(32)).toBe(" "); // First valid ASCII
    expect(charCodeToString(126)).toBe("~"); // Last valid ASCII
  });

  test("charCodeToString: should ignore control characters or invalid ASCII", () => {
    expect(charCodeToString(0)).toBe("");
    expect(charCodeToString(31)).toBe("");
    expect(charCodeToString(127)).toBe("");
    expect(charCodeToString(255)).toBe("");
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

  test("instructionStringToHex: should replace numbers correctly", () => {
    expect(instructionStringToHex("ADD 255")).toBe("ADD hFF");
    expect(instructionStringToHex("ADD 255,I")).toBe("ADD hFF,I");
    expect(instructionStringToHex("ADD #255")).toBe("ADD #hFF");
    expect(instructionStringToHex("TWO 128 255")).toBe("TWO h80 hFF"); // Two arguments
    expect(instructionStringToHex("IF R10 128 255")).toBe("IF R10 h80 hFF"); // Number in register (not replaced)
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
