import { bitPatternToUnsignedByte, unsignedByteToBitPattern } from "./utils/Conversions";
import { RegExpMatcher } from "./utils/RegExpMatcher";

export type RegisterInfo = { value: number, numBits: number, isData: boolean };

export class Register {

  public static readonly NO_BIT_CODE = -1;

  private readonly name: string;
  private readonly bitPattern: string; // Empty string if not directly accessible
  private readonly bitPatternMatcher: RegExpMatcher;

  private value: number;
  private readonly numOfBits: number;
  private readonly valueMask: number;
  private readonly isData: boolean;

  constructor(name: string, bitPattern: string, numOfBits: number, isData = true) {
    this.name = name;
    this.bitPattern = bitPattern;
    this.numOfBits = numOfBits;
    this.isData = isData;

    this.value = 0;
    this.valueMask = (1 << numOfBits) - 1; // 0xFF for 8-bit registers
    this.bitPatternMatcher = new RegExpMatcher(this.bitPattern);
  }

  public getName(): string {
    return this.name;
  }

  public getBitPattern(): string {
    return this.bitPattern;
  }

  // Returns NO_BIT_CODE if register isn't directly accessible
  public getBitCode(): number {
    if (this.bitPattern === "") {
      return Register.NO_BIT_CODE;
    } else {
      return bitPatternToUnsignedByte(this.bitPattern);
    }
  }

  public getValue(): number {
    return this.value;
  }

  public setValue(value: number): void {
    this.value = value & this.valueMask;
  }

  public matchByte(byte: number): boolean {
    return this.bitPatternMatcher.fullMatch(unsignedByteToBitPattern(byte));
  }

  public getInfo(): RegisterInfo {
    return {
      value: this.value,
      numBits: this.numOfBits,
      isData: this.isData
    };
  }

}
