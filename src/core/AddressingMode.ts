import { Conversion } from "./Conversion";
import { QRegExp } from "./Utils";

export enum AddressingModeCode {
  DIRECT, INDIRECT, IMMEDIATE, INDEXED_BY_X, INDEXED_BY_PC
}

export class AddressingMode {

  static readonly NO_PATTERN = "";

  private readonly bitPattern: string;
  private readonly addressingModeCode: AddressingModeCode;
  private readonly assemblyPattern: string;
  private readonly assemblyRegExp: QRegExp;

  constructor(bitPattern: string, addressingModeCode: AddressingModeCode, assemblyPattern: string) {
    this.bitPattern = bitPattern;
    this.addressingModeCode = addressingModeCode;
    this.assemblyPattern = assemblyPattern;
    this.assemblyRegExp = new QRegExp(assemblyPattern, "i");
  }

  public getBitPattern(): string {
    return this.bitPattern;
  }

  public getBitCode(): number {
    return Conversion.stringToValue(this.bitPattern);
  }

  public getAddressingModeCode(): AddressingModeCode {
    return this.addressingModeCode;
  }

  public getAssemblyPattern(): string {
    return this.assemblyPattern;
  }

  public getAssemblyRegExp(): QRegExp {
    return this.assemblyRegExp;
  }

}
