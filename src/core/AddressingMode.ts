import { RegExpMatcher } from "./utils/RegExpMatcher";

export enum AddressingModeCode {
  DIRECT = "DIRECT",
  INDIRECT = "INDIRECT",
  IMMEDIATE = "IMMEDIATE",
  INDEXED_BY_X = "INDEXED_BY_X",
  INDEXED_BY_PC = "INDEXED_BY_PC",

  // Cesar
  REGISTER = "REGISTER",
  REGISTER_POST_INC = "REGISTER_POST_INC",
  REGISTER_PRE_DEC = "REGISTER_PRE_DEC",
  REGISTER_INDEXED = "REGISTER_INDEXED",
  INDIRECT_REGISTER = "INDIRECT_REGISTER",
  INDIRECT_REGISTER_POST_INC = "INDIRECT_REGISTER_POST_INC",
  INDIRECT_REGISTER_PRE_DEC = "INDIRECT_REGISTER_PRE_DEC",
  INDIRECT_REGISTER_INDEXED = "INDIRECT_REGISTER_INDEXED"
}

function defaultPatternToMatcher(assemblyPattern: string): RegExpMatcher {
  return new RegExpMatcher(assemblyPattern.replace("a", "(.*)"), "i");
}

export class AddressingMode {

  static readonly NO_PATTERN = "";

  private readonly bitPattern: string;
  private readonly addressingModeCode: AddressingModeCode;
  private readonly assemblyPattern: string;
  private readonly assemblyPatternMatcher: RegExpMatcher | null;
  private readonly bitPatternMatcher: RegExpMatcher;

  constructor(bitPattern: string, addressingModeCode: AddressingModeCode, assemblyPattern: string, patternToMatcher = defaultPatternToMatcher) {
    this.bitPattern = bitPattern;
    this.addressingModeCode = addressingModeCode;
    this.assemblyPattern = assemblyPattern;
    this.assemblyPatternMatcher = assemblyPattern ? patternToMatcher(assemblyPattern) : null;
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

  public extractMatchingGroups(argument: string): Record<string, string> | null {
    return this.assemblyPatternMatcher?.fullMatch(argument) ? this.assemblyPatternMatcher.groups() : null;
  }

}
