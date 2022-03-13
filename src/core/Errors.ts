export enum FileErrorCode {
  NO_ERROR = 0,
  INPUT_OUTPUT,
  INCORRECT_SIZE,
  INVALID_IDENTIFIER,
}

export enum MachineErrorCode {
  NO_ERROR = 0,
  WRONG_NUMBER_OF_ARGUMENTS,
  INVALID_INSTRUCTION,
  INVALID_ADDRESS,
  INVALID_VALUE,
  INVALID_STRING,
  INVALID_LABEL,
  INVALID_ARGUMENT,
  DUPLICATE_LABEL,
  MEMORY_OVERLAP,
  NOT_IMPLEMENTED
}

export class MachineError extends Error {

  errorCode: MachineErrorCode;

  constructor(errorCode: MachineErrorCode) {
    super();
    this.errorCode = errorCode;
  }

}
