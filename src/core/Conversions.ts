import { RegisterInfo } from "./Register";

export function bitPatternToUnsignedByte(bitPattern: string): number {
  let value = 0;

  for (let i = 0; i < 8; i++) {
    value += (bitPattern[7 - i] === "1") ? (1 << i) : 0; // Don't care bits evaluate to zero
  }

  return value;
}

export function unsignedByteToBitPattern(value: number): string {
  let str = "";

  for (let i = 7; i >= 0; i--) {
    str += ((value & (1 << i)) !== 0) ? "1" : "0";
  }

  return str;
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

export function charCodeToString(charCode: number): string {
  // Restricted to ASCII to maximize compatibility
  if (charCode >= 32 && charCode <= 126) {
    return String.fromCharCode(charCode);
  } else {
    return "";
  }
}

export function numberToHex(value: number, numDigits: number): string {
  return value.toString(16).toUpperCase().padStart(numDigits, "0");
}

export function addressToHex(value: number, memorySize: number): string {
  const numDigits = (memorySize - 1).toString(16).length;
  return numberToHex(value, numDigits);
}

export function unsignedByteToString(value: number, { displayHex, displayNegative }: { displayHex?: boolean, displayNegative?: boolean}): string {
  if (displayHex) {
    return numberToHex(value, 2);
  } else if (displayNegative) {
    return String(unsignedByteToSigned(value));
  } else {
    return String(value);
  }
}

export function registerValueToString(
  { value, numBits, isData }: RegisterInfo,
  { displayHex, displayNegative }: { displayHex?: boolean, displayNegative?: boolean}
): string {
  if (displayHex) {
    return numberToHex(value, Math.ceil(numBits / 4));
  } else if (displayNegative && isData) {
    return String(value << (32 - numBits) >> (32 - numBits));
  } else {
    return String(value);
  }
}
