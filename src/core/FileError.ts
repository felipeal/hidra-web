export enum FileErrorCode {
  EMPTY_BINARY_FILE = "EMPTY_BINARY_FILE",
  INVALID_BINARY_FILE = "INVALID_BINARY_FILE",
  INVALID_BINARY_SIZE = "INVALID_BINARY_SIZE",
  UNKNOWN_IDENTIFIER = "UNKNOWN_IDENTIFIER"
}

export class FileError extends Error {

  public readonly errorCode: FileErrorCode;

  constructor(errorCode: FileErrorCode) {
    super();
    this.errorCode = errorCode;
  }

}
