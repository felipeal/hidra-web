import { bitPatternToUnsignedByte } from "./utils/Conversions";
import { RegExpMatcher } from "./utils/RegExpMatcher";

export enum AddressingModeCode {
  DIRECT = "DIRECT",
  INDIRECT = "INDIRECT",
  IMMEDIATE = "IMMEDIATE",
  INDEXED_BY_X = "INDEXED_BY_X",
  INDEXED_BY_PC = "INDEXED_BY_PC"
}

export class AddressingMode {

  static readonly NO_PATTERN = "";

  private readonly bitPattern: string;
  private readonly addressingModeCode: AddressingModeCode;
  private readonly assemblyPattern: string;
  private readonly patternMatcher: RegExpMatcher | null;

  constructor(bitPattern: string, addressingModeCode: AddressingModeCode, assemblyPattern: string) {
    this.bitPattern = bitPattern;
    this.addressingModeCode = addressingModeCode;
    this.assemblyPattern = assemblyPattern;
    this.patternMatcher = assemblyPattern ? new RegExpMatcher(assemblyPattern, "i") : null;
  }

  public getBitPattern(): string {
    return this.bitPattern;
  }

  public getBitCode(): number {
    return bitPatternToUnsignedByte(this.bitPattern);
  }

  public getAddressingModeCode(): AddressingModeCode {
    return this.addressingModeCode;
  }

  public getAssemblyPattern(): string {
    return this.assemblyPattern;
  }

  public extractMatchingValue(argument: string): string | null {
    return this.patternMatcher?.fullMatch(argument) ? this.patternMatcher.cap(1) : null;
  }

}
