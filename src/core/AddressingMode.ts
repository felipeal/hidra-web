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
  private readonly assemblyPatternMatcher: RegExpMatcher | null;
  private readonly bitPatternMatcher: RegExpMatcher;

  constructor(bitPattern: string, addressingModeCode: AddressingModeCode, assemblyPattern: string) {
    this.bitPattern = bitPattern;
    this.addressingModeCode = addressingModeCode;
    this.assemblyPattern = assemblyPattern;
    this.assemblyPatternMatcher = assemblyPattern ? new RegExpMatcher(assemblyPattern, "i") : null;
    this.bitPatternMatcher = new RegExpMatcher(bitPattern);
  }

  public getBitPattern(): string {
    return this.bitPattern;
  }

  public matchesBitPattern(bitPattern: string): boolean {
    return this.bitPatternMatcher.fullMatch(bitPattern);
  }

  public getAddressingModeCode(): AddressingModeCode {
    return this.addressingModeCode;
  }

  public getAssemblyPattern(): string {
    return this.assemblyPattern;
  }

  public extractMatchingValue(argument: string): string | null {
    return this.assemblyPatternMatcher?.fullMatch(argument) ? this.assemblyPatternMatcher.cap(1) : null;
  }

}
