export class Conversion {

  public static bitPatternToByteValue(bitPattern: string): number {
    let value = 0;

    for (let i = 0; i < 8; i++) {
      value += (bitPattern[7 - i] === "1") ? (1 << i) : 0; // Don't care bits evaluate to zero
    }

    return value;
  }

  public static byteValueToBitPattern(value: number): string {
    let str = "";

    for (let i = 7; i >= 0; i--) {
      str += ((value & (1 << i)) !== 0) ? "1" : "0";
    }

    return str;
  }

}
