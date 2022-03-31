export enum AssemblerErrorCode {
  TOO_FEW_ARGUMENTS = "TOO_FEW_ARGUMENTS",
  TOO_MANY_ARGUMENTS = "TOO_MANY_ARGUMENTS",
  INVALID_MNEMONIC = "INVALID_MNEMONIC",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_VALUE = "INVALID_VALUE",
  INVALID_STRING = "INVALID_STRING",
  INVALID_CHARACTER = "INVALID_CHARACTER",
  INVALID_LABEL = "INVALID_LABEL",
  INVALID_ARGUMENT = "INVALID_ARGUMENT",
  INVALID_SEPARATOR = "INVALID_SEPARATOR",
  DUPLICATE_LABEL = "DUPLICATE_LABEL",
  LABEL_NOT_ALLOWED = "LABEL_NOT_ALLOWED",
  MEMORY_OVERLAP = "MEMORY_OVERLAP",
  MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED"
}

export class AssemblerError extends Error {

  public readonly errorCode: AssemblerErrorCode;

  constructor(errorCode: AssemblerErrorCode) {
    super();
    this.errorCode = errorCode;
  }

}

export type ErrorMessage = {lineNumber: number, errorCode: AssemblerErrorCode};
