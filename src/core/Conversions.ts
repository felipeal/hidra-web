export function bitPatternToByteValue(bitPattern: string): number {
  let value = 0;

  for (let i = 0; i < 8; i++) {
    value += (bitPattern[7 - i] === "1") ? (1 << i) : 0; // Don't care bits evaluate to zero
  }

  return value;
}

export function byteValueToBitPattern(value: number): string {
  let str = "";

  for (let i = 7; i >= 0; i--) {
    str += ((value & (1 << i)) !== 0) ? "1" : "0";
  }

  return str;
}

export function unsignedByteToSignedByte(unsignedValue: number): number {
  return unsignedValue << 24 >> 24;
}

export function valueStringToNumber(decOrHex: string): number {
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

export function byteToString(value: number, { displayHex, displayNegative }: { displayHex?: boolean, displayNegative?: boolean}): string {
  if (displayHex) {
    return value.toString(16).toUpperCase().padStart(2, "0");
  } else if (displayNegative) {
    return String(unsignedByteToSignedByte(value));
  } else {
    return String(value);
  }
}

export function addressToHexString(value: number, memorySize: number): string {
  const maxLength = (memorySize - 1).toString(16).length;
  return Number(value).toString(16).toUpperCase().padStart(maxLength, "0");
}
