import { RegisterInfo } from "../Register";

type DisplayHexOrNegative = { displayHex?: boolean, displayNegative?: boolean };

export function bitPatternToUnsignedByte(bitPattern: string): number {
  return parseInt(bitPattern.replaceAll(".", "0"), 2); // "Don't care" bits evaluate to zero
}

export function unsignedByteToBitPattern(value: number): string {
  return value.toString(2).padStart(8, "0");
}

export function unsignedByteToSigned(unsignedValue: number): number {
  return unsignedValue << 24 >> 24;
}

export function codeStringToNumber(decOrHex: string): number {
  if (decOrHex.toLowerCase().startsWith("h")) {
    return parseInt(decOrHex.slice(1), 16); // Slice removes "h" prefix
  } else {
    return parseInt(decOrHex, 10);
  }
}

export function uncheckedByteStringToNumber(decOrHex: string, { displayHex }: { displayHex: boolean }): number {
  return parseInt(decOrHex, displayHex ? 16 : 10) & 0xFF;
}

export function charCodeToString(charCode: number): string {
  // Restricted to ASCII to maximize compatibility
  if (charCode >= 32 && charCode <= 126) {
    return String.fromCharCode(charCode);
  } else {
    return "";
  }
}

export function unsignedNumberToHex(value: number, numDigits: number): string {
  return value.toString(16).toUpperCase().padStart(numDigits, "0");
}

export function addressToHex(value: number, memorySize: number): string {
  const numDigits = (memorySize - 1).toString(16).length;
  return unsignedNumberToHex(value, numDigits);
}

export function instructionStringToDisplayMode(instructionString: string, { displayHex, displayNegative }: DisplayHexOrNegative): string {
  if (displayHex) {
    return numbersToHex(instructionString);
  } else if (displayNegative) {
    return immediateValuesToNegative(instructionString);
  } else {
    return instructionString;
  }
}

export function numbersToHex(instructionString: string): string {
  return instructionString.replace(/\b\d+\b/g, (v) => unsignedNumberToHexCodeString(Number(v)));
}

// Note: Assumes 8-bit immediate values
export function immediateValuesToNegative(instructionString: string): string {
  return instructionString.replace(/#\d+\b/g, (v) => "#" + String(unsignedByteToSigned(Number(v.slice(1)))));
}

export function unsignedNumberToHexCodeString(value: number): string {
  return "h" + value.toString(16).toUpperCase();
}

export function unsignedByteToString(value: number, { displayHex, displayNegative }: DisplayHexOrNegative): string {
  if (displayHex) {
    return unsignedNumberToHex(value, 2);
  } else if (displayNegative) {
    return String(unsignedByteToSigned(value));
  } else {
    return String(value);
  }
}

export function registerValueToString({ value, numBits, isData }: RegisterInfo, { displayHex, displayNegative }: DisplayHexOrNegative): string {
  if (displayHex) {
    return unsignedNumberToHex(value, Math.ceil(numBits / 4));
  } else if (displayNegative && isData) {
    return String(value << (32 - numBits) >> (32 - numBits));
  } else {
    return String(value);
  }
}
