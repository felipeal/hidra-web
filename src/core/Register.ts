import { Conversion } from "./Conversion";
import { QRegExp } from "./Utils";

export class Register {

  public static readonly NO_BIT_CODE = -1;

  private readonly name: string;
  private readonly bitPattern: string; // Empty string if not directly accessible

  private value: number;
  private readonly numOfBits: number;
  private readonly valueMask: number;
  private readonly isDataFlag: boolean;

  constructor(name: string, bitPattern: string, numOfBits: number, isData = true) {
    this.name = name;
    this.bitPattern = bitPattern;
    this.numOfBits = numOfBits;
    this.isDataFlag = isData;

    this.value = 0;
    this.valueMask = (1 << numOfBits) - 1; // 0xFF for 8-bit registers
  }

  public getName(): string {
    return this.name;
  }

  public getBitPattern(): string {
    return this.bitPattern;
  }

  public getNumberOfBits(): number {
    return this.numOfBits;
  }

  // Returns NO_BIT_CODE if register isn't directly accessible
  public getBitCode(): number {
    if (this.bitPattern === "") {
      return Register.NO_BIT_CODE;
    } else {
      return Conversion.bitPatternToByteValue(this.bitPattern);
    }
  }

  public getValue(): number {
    return this.value;
  }

  public getSignedValue(): number {
    const signBitMask = 1 << (this.numOfBits - 1); // 0x80 for 8-bit registers

    if ((this.value & signBitMask) !== 0) { // If signed
      return this.value - (1 << this.numOfBits); // value - 256 for 8-bit registers
    } else {
      return this.value;
    }
  }

  public setValue(value: number): void {
    this.value = value & this.valueMask;
  }

  public matchByte(byte: number): boolean {
    const bitPatternRegExp = new QRegExp(this.bitPattern);
    return bitPatternRegExp.exactMatch(Conversion.byteValueToBitPattern(byte));
  }

  public isData(): boolean {
    return this.isDataFlag;
  }

}
