import { bitPatternToUnsignedByte, unsignedByteToBitPattern } from "./utils/Conversions";
import { RegExpMatcher } from "./utils/RegExpMatcher";

export enum InstructionCode {
  NOP,
  STR, LDR,
  ADD, OR, AND, NOT, SUB,
  JMP, JN, JP, JV, JNV, JZ, JNZ, JC, JNC, JB, JNB, JSR,
  NEG, SHR, SHL, ROR, ROL,
  HLT,

  REG_INC, REG_DEC, REG_IF,

  VOLTA_ADD, VOLTA_SUB, VOLTA_AND, VOLTA_OR, VOLTA_CLR, VOLTA_NOT, VOLTA_NEG,
  VOLTA_INC, VOLTA_DEC, VOLTA_ASR, VOLTA_ASL, VOLTA_ROR, VOLTA_ROL,
  VOLTA_SZ, VOLTA_SNZ, VOLTA_SPL, VOLTA_SMI, VOLTA_SPZ, VOLTA_SMZ,
  VOLTA_SEQ, VOLTA_SNE, VOLTA_SGR, VOLTA_SLS, VOLTA_SGE, VOLTA_SLE,
  VOLTA_RTS, VOLTA_PSH, VOLTA_POP, VOLTA_JMP, VOLTA_JSR
}

export class Instruction {

  private readonly numBytes: number;
  private readonly bitPattern: string;
  private readonly byteRegExp: RegExpMatcher;
  private readonly mnemonic: string;
  private readonly assemblyFormat: string;
  private readonly parameters: string[];
  private readonly instructionCode: InstructionCode;

  constructor(numBytes: number, bitPattern: string, instructionCode: InstructionCode, assemblyFormat: string) {
    this.numBytes = numBytes; // 0 if variable
    this.bitPattern = bitPattern;
    this.byteRegExp = new RegExpMatcher(bitPattern);
    this.instructionCode = instructionCode;

    const assemblyFormatList = assemblyFormat.split(" ");

    this.mnemonic = assemblyFormatList.shift()!;
    this.parameters = assemblyFormatList; // Mnemonic not included
    this.assemblyFormat = assemblyFormat;
  }

  public matchByte(byte: number): boolean {
    return this.byteRegExp.fullMatch(unsignedByteToBitPattern(byte));
  }

  public getMnemonic(): string {
    return this.mnemonic;
  }

  public getParameters(): string[] {
    return this.parameters;
  }

  // TODO: Use elsewhere
  // Returns -1 if not found
  public getParameterPos(parameter: string): number {
    return this.parameters.indexOf(parameter);
  }

  public hasParameter(parameter: string): boolean {
    return this.parameters.includes(parameter);
  }

  public getAssemblyFormat(): string {
    return this.assemblyFormat;
  }

  public getByteValue(): number {
    return bitPatternToUnsignedByte(this.bitPattern);
  }

  public getNumBytes(): number {
    return this.numBytes;
  }

  public getNumberOfParameters(): number {
    return this.parameters.length;
  }

  public getInstructionCode(): InstructionCode {
    return this.instructionCode;
  }

}
