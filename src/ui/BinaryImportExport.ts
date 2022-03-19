import { FileErrorCode } from "../core/Errors";

export class BinaryImportExport {

  // Returns true if successful
  public importMemory(_filename: string): FileErrorCode {
    throw new Error("Not implemented");
    /*
    const byte: string;
    QFile this.memFile(filename); // Implicitly closed

    // Open file
    memFile.open(QFile.ReadOnly);

    if (memFile.size() !== 1 + this.identifier.length + this.memory.size() * 2)
        return FileErrorCode.INCORRECT_SIZE;

    // Read identifier length
    memFile.getChar(&byte);
    if (byte !== this.identifier.length)
        return FileErrorCode.INVALID_IDENTIFIER; // Incorrect identifier length

    // Read identifier
    for (let i = 0; i < this.identifier.length; i++)
    {
        memFile.getChar(&byte);

        if (byte !== this.identifier[i].toLatin1())
            return FileErrorCode.INVALID_IDENTIFIER; // Wrong character
    }

    // Read memory
    for (let address = 0; address < this.memory.size(); address++)
    {
        memFile.getChar(&byte);
        this.setMemoryValue(address, byte);
        memFile.getChar(&byte); // Skip byte
    }

    // Return error status
    if (memFile.error() !== QFileDevice.NoError)
        return FileErrorCode.INPUT_OUTPUT;
    else
        return FileErrorCode.NO_ERROR;
    */
  }

  // Returns true if successful
  public exportMemory(_filename: string): FileErrorCode {
    throw new Error("Not implemented");
    /*
    QFile this.memFile(filename); // Implicitly closed

    // Open file
    memFile.open(QFile.WriteOnly);

    // Write identifier length
    memFile.putChar((unsigned char)this.identifier.length);

    // Write identifier
    for (let i = 0; i < this.identifier.length; i++)
    {
        memFile.putChar(this.identifier[i].toLatin1());
    }

    // Write memory bytes
    for (const byte of this.memory)
    {
        memFile.putChar(byte.getValue());
        memFile.putChar(0);
    }

    // Return error status
    if (memFile.error() !== QFileDevice.NoError)
        return FileErrorCode.INPUT_OUTPUT;
    else
        return FileErrorCode.NO_ERROR;
    */
  }

}
