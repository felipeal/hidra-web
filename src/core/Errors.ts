export enum FileErrorCode {
  NO_ERROR = 0,
  INPUT_OUTPUT,
  INCORRECT_SIZE,
  INVALID_IDENTIFIER,
}

export enum AssemblerErrorCode {
  NO_ERROR = 0,
  TOO_FEW_ARGUMENTS,
  TOO_MANY_ARGUMENTS,
  INVALID_MNEMONIC,
  INVALID_ADDRESS,
  INVALID_VALUE,
  INVALID_STRING,
  INVALID_LABEL,
  INVALID_ARGUMENT,
  INVALID_SEPARATOR,
  DUPLICATE_LABEL,
  LABEL_NOT_ALLOWED,
  MEMORY_OVERLAP,
  MEMORY_LIMIT_EXCEEDED,
  NOT_IMPLEMENTED
}

export class AssemblerError extends Error {

  public readonly errorCode: AssemblerErrorCode;

  constructor(errorCode: AssemblerErrorCode) {
    super();
    this.errorCode = errorCode;
  }

}

export type ErrorMessage = {lineNumber: number, errorCode: AssemblerErrorCode};
