import { AssemblerError, AssemblerErrorCode } from "./Errors";
import { Register } from "./Register";
import { Instruction } from "./Instruction";
import { AddressingModeCode } from "./AddressingMode";
import { EventCallback, QRegExp } from "./Utils";
import { Texts } from "./Texts";
import { Byte } from "./Byte";
import { Machine } from "./Machine";

export class Assembler {

  // Constants
  protected static readonly WHITESPACE = new QRegExp("\\s+");
  protected static readonly QUOTE_SYMBOL = "\uFFFF"; // Reserved unicode character

  protected readonly machine: Machine;
  protected reserved: boolean[];
  protected buildSuccessful = false;
  protected firstErrorLine = -1;

  private readonly pc: Register;
  private assemblerMemory: Byte[] = [];
  private addressCorrespondingSourceLine: number[];
  private sourceLineCorrespondingAddress: number[] = [];
  private addressCorrespondingLabel: string[];
  private labelPCMap: Map<string, number> = new Map();
  private eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(machine: Machine) {
    this.machine = machine;
    this.pc = new Register("PC", "", machine.getPCNumberOfBits(), false);

    // Initialize memory arrays
    new Array(machine.getMemorySize()).fill(null).forEach(() => this.assemblerMemory.push(new Byte()));
    this.reserved = new Array(machine.getMemorySize()).fill(false);
    this.addressCorrespondingSourceLine = new Array(machine.getMemorySize()).fill(-1);
    this.addressCorrespondingLabel = new Array(machine.getMemorySize()).fill("");
  }

  //////////////////////////////////////////////////
  // Assembler
  //////////////////////////////////////////////////

  // Returns an array of error messages on failure
  public build(sourceCode: string): string[] {
    this.buildSuccessful = false;
    this.firstErrorLine = -1;

    const errorMessages: string[] = [];

    //////////////////////////////////////////////////
    // Simplify source code
    //////////////////////////////////////////////////

    const sourceLines = sourceCode.split(/\r?\n/); // Split source code to individual lines

    // Strip comments and extra spaces
    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
      // Convert literal quotes to special symbol
      sourceLines[lineIndex] = sourceLines[lineIndex].replaceAll("''''", "'" + Assembler.QUOTE_SYMBOL); // '''' . 'QUOTE_SYMBOL
      sourceLines[lineIndex] = sourceLines[lineIndex].replaceAll("'''", Assembler.QUOTE_SYMBOL); // ''' . QUOTE_SYMBOL

      // Remove comments
      sourceLines[lineIndex] = this.removeComment(sourceLines[lineIndex]);

      // Trim whitespace
      sourceLines[lineIndex] = sourceLines[lineIndex].trim();
    }

    //////////////////////////////////////////////////
    // FIRST PASS: Read labels, reserve memory
    //////////////////////////////////////////////////

    this.clearAssemblerData();
    this.setPCValue(0);

    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
      try {

        //////////////////////////////////////////////////
        // Read labels
        //////////////////////////////////////////////////

        if (sourceLines[lineIndex].includes(":")) { // If getLabel found a label
          const labelName = sourceLines[lineIndex].split(":")[0];

          // Check for invalid label name
          if (!this.isValidLabelFormat(labelName)) {
            throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL);
          }

          // Check for duplicate label
          if (this.labelPCMap.has(labelName.toLowerCase())) {
            throw new AssemblerError(AssemblerErrorCode.DUPLICATE_LABEL);
          }

          this.labelPCMap.set(labelName.toLowerCase(), this.getPCValue()); // Add to map
          this.setAddressCorrespondingLabel(this.getPCValue(), labelName);
          sourceLines[lineIndex] = sourceLines[lineIndex].replaceAll(labelName + ":", "").trim(); // Remove label from line
        }

        //////////////////////////////////////////////////
        // Reserve memory for instructions/directives
        //////////////////////////////////////////////////

        if (sourceLines[lineIndex].length > 0) {
          const mnemonic = sourceLines[lineIndex].split(Assembler.WHITESPACE)[0].toLowerCase();

          const instruction = this.machine.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            let numBytes = instruction.getNumBytes();

            if (numBytes === 0) { // If instruction has variable number of bytes
              const addressArgument = sourceLines[lineIndex].split(Assembler.WHITESPACE).slice(-1).join(" "); // Last argument
              const { addressingModeCode } = this.extractArgumentAddressingModeCode(addressArgument);
              numBytes = this.machine.calculateInstructionNumBytes(instruction, addressingModeCode);
            }

            this.reserveAssemblerMemory(numBytes, lineIndex);
          } else { // Directive
            const args = sourceLines[lineIndex].split(Assembler.WHITESPACE).slice(1).join(" "); // Everything after mnemonic
            this.obeyDirective(mnemonic, args, true, lineIndex);
          }
        }

      } catch (error: unknown) {
        /* istanbul ignore else */
        if (error instanceof AssemblerError) {
          if (this.firstErrorLine === -1) {
            this.firstErrorLine = lineIndex;
          }
          errorMessages.push(Texts.buildErrorMessage(lineIndex, error.errorCode));
        } else {
          throw error;
        }
      }
    }

    if (this.firstErrorLine >= 0) {
      return errorMessages; // Error(s) found, abort compilation
    }

    //////////////////////////////////////////////////
    // SECOND PASS: Build instructions/defines
    //////////////////////////////////////////////////

    this.sourceLineCorrespondingAddress = new Array(sourceLines.length).fill(-1);
    this.setPCValue(0);

    for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
      try {
        this.sourceLineCorrespondingAddress[lineIndex] = this.getPCValue();

        if (sourceLines[lineIndex].length > 0) {
          const mnemonic = sourceLines[lineIndex].split(Assembler.WHITESPACE)[0].toLowerCase();
          const args = sourceLines[lineIndex].split(Assembler.WHITESPACE).slice(1).join(" "); // Everything after mnemonic

          const instruction: Instruction | null = this.machine.getInstructionFromMnemonic(mnemonic);
          if (instruction !== null) {
            this.buildInstruction(instruction, args);
          } else { // Directive
            this.obeyDirective(mnemonic, args, false, lineIndex);
          }
        }
      } catch (error: unknown) {
        /* istanbul ignore else */
        if (error instanceof AssemblerError) {
          if (this.firstErrorLine === -1) {
            this.firstErrorLine = lineIndex;
          }
          errorMessages.push(Texts.buildErrorMessage(lineIndex, error.errorCode));
        } else {
          throw error;
        }
      }
    }

    if (this.firstErrorLine >= 0) {
      return errorMessages; // Error(s) found, abort compilation
    }

    this.buildSuccessful = true;

    this.copyAssemblerMemoryToMemory();

    this.machine.clearAfterBuild();

    return [];
  }

  protected removeComment(line: string) {
    let isInsideString = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === "'") {
        isInsideString = !isInsideString;
      } else if (line[i] === ";" && !isInsideString) {
        return line.slice(0, i);
      }
    }
    return line;
  }

  // Mnemonic must be lowercase
  protected obeyDirective(mnemonic: string, args: string, reserveOnly: boolean, sourceLine: number): void {
    if (mnemonic === "org") {
      const argumentList = args.trim().split(Assembler.WHITESPACE).filter(argument => /\S/.test(argument)); // Filters out empty strings
      const numberOfArguments = argumentList.length;

      if (numberOfArguments < 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
      } else if (numberOfArguments > 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS);
      } else if (!this.isValidOrg(argumentList[0])) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ADDRESS);
      }

      this.setPCValue(this.stringToInt(argumentList[0]));
    } else if (new QRegExp("db|dw|dab|daw").exactMatch(mnemonic)) {
      const { argumentList, isAllocate } = this.splitArguments(args);

      const bytesPerArgument = (mnemonic === "db" || mnemonic === "dab") ? 1 : 2;
      const isDefineArray = (mnemonic === "dab" || mnemonic === "daw");

      if (!isDefineArray && argumentList.length === 0) {
        argumentList.push("0"); // Default to argument 0 in case of DB and DW
      }

      if (!isDefineArray && argumentList.length > 1) {
        throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS); // TODO: Error specific to strings too?
      }

      if (isDefineArray && argumentList.length < 1) { // No arguments
        throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
      }

      // Memory allocation
      if (isAllocate) {
        if (mnemonic !== "dab" && mnemonic !== "daw") {
          throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
        } else if (reserveOnly) {
          this.reserveAssemblerMemory(Number(argumentList[0]) * bytesPerArgument, sourceLine);
        } else { // Skip bytes
          this.incrementPCValue(Number(argumentList[0]) * bytesPerArgument);
        }
      } else if (reserveOnly) {
        this.reserveAssemblerMemory(argumentList.length * bytesPerArgument, sourceLine); // Increments PC
      } else {
        // Process each argument
        for (const argument of argumentList) {
          // TODO: Should labels only be allowed in DB/DW and not in DAB/DAW to replicate Daedalus?
          const value = this.argumentToValue(argument, true, bytesPerArgument);

          // Write value
          if (bytesPerArgument === 2 && this.machine.isLittleEndian()) {
            this.setAssemblerMemoryNext(value & 0xFF); // Least significant byte first
            this.setAssemblerMemoryNext((value >> 8) & 0xFF);
          } else if (bytesPerArgument === 2) { // Big endian
            this.setAssemblerMemoryNext((value >> 8) & 0xFF); // Most significant byte first
            this.setAssemblerMemoryNext(value & 0xFF);
          } else {
            this.setAssemblerMemoryNext(value & 0xFF);
          }
        }
      }
    } else {
      throw new AssemblerError(AssemblerErrorCode.INVALID_INSTRUCTION);
    }
  }

  protected buildInstruction(instruction: Instruction, args: string): void {
    const argumentList = args.split(Assembler.WHITESPACE).filter(argument => /\S/.test(argument)); // Filters out empty strings
    const instructionArguments = instruction.getArguments(); let isImmediate = false;
    let registerBitCode = 0b00000000;
    let addressingModeBitCode = 0b00000000;

    // Check if number of arguments is correct
    if (argumentList.length < instruction.getNumberOfArguments()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_FEW_ARGUMENTS);
    } else if (argumentList.length > instruction.getNumberOfArguments()) {
      throw new AssemblerError(AssemblerErrorCode.TOO_MANY_ARGUMENTS);
    }

    // If argumentList contains a register
    if (instructionArguments.includes("r")) {
      registerBitCode = this.machine.getRegisterBitCode(argumentList[0]);

      if (registerBitCode === Register.NO_BIT_CODE) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT); // Register not found (or invisible)
      }
    }

    // If argumentList contains an address/value
    if (instructionArguments.includes("a")) {
      const { argument: newArgument, addressingModeCode } = this.extractArgumentAddressingModeCode(argumentList[argumentList.length - 1]); // Removes addressing mode from argument
      argumentList[argumentList.length - 1] = newArgument; // TODO: Refactor
      addressingModeBitCode = this.machine.getAddressingModeBitCode(addressingModeCode);
      isImmediate = (addressingModeCode === AddressingModeCode.IMMEDIATE);
    }

    // Write first byte (instruction with register and addressing mode)
    this.setAssemblerMemoryNext(instruction.getByteValue() | registerBitCode | addressingModeBitCode);

    // Write second byte (if 1-byte address/immediate value)
    if (instruction.getNumBytes() === 2 || isImmediate) {
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[argumentList.length - 1], isImmediate)); // Converts labels, chars, etc.

    // Write second and third bytes (if 2-byte addresses)
    } else if (instructionArguments.includes("a")) {
      const address = this.argumentToValue(argumentList[argumentList.length - 1], isImmediate);

      this.setAssemblerMemoryNext(address & 0xFF); // Least significant byte (little-endian)
      this.setAssemblerMemoryNext((address >> 8) & 0xFF); // Most significant byte

    // If instruction has two addresses (REG_IF), write both addresses
    } else if (instructionArguments.includes("a0") && instructionArguments.includes("a1")) {
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instructionArguments.indexOf("a0")], false));
      this.setAssemblerMemoryNext(this.argumentToValue(argumentList[instructionArguments.indexOf("a1")], false));
    }
  }

  // Increments PC
  protected setAssemblerMemoryNext(value: number): void {
    this.assemblerMemory[this.getPCValue()].setValue(value);
    this.incrementPCValue();
  }

  // Copies assemblerMemory to machine's memory
  protected copyAssemblerMemoryToMemory(): void {
    for (let i = 0; i < this.machine.getMemorySize(); i++) {
      // Copy only different values to avoid marking bytes as changed
      if (this.machine.getMemoryValue(i) !== this.assemblerMemory[i].getValue()) {
        this.machine.setMemoryValue(i, this.assemblerMemory[i].getValue());
      }
    }
  }

  // Reserve 'sizeToReserve' bytes starting from PC, associate addresses with a source line. Throws exception on overlap.
  protected reserveAssemblerMemory(sizeToReserve: number, associatedSourceLine: number): void {
    while (sizeToReserve > 0) {
      if (!this.reserved[this.getPCValue()]) {
        this.reserved[this.getPCValue()] = true;
        this.addressCorrespondingSourceLine[this.getPCValue()] = associatedSourceLine;
        this.incrementPCValue();
        sizeToReserve--;
      } else {
        throw new AssemblerError(AssemblerErrorCode.MEMORY_OVERLAP); // Memory already reserved
      }
    }
  }

  // Validates label names (must start with a letter/underline, may have numbers)
  protected isValidLabelFormat(labelName: string): boolean {
    const validLabel = new QRegExp("[a-z_][a-z0-9_]*");
    return validLabel.exactMatch(labelName.toLowerCase());
  }

  // Returns true if conversion ok and value between min and max (closed interval)
  protected isValidValue(valueString: string, min: number, max: number): boolean {
    return this.isValidValueFormat(valueString) && this.isValueInRange(valueString, min, max);
  }

  protected isValidValueFormat(valueString: string): boolean {
    valueString = valueString.toLowerCase();

    if (valueString.startsWith("h")) {
      return /^h[0-9a-f]{1,6}$/.test(valueString); // TODO: Forbid negative on Hidra C++?
    } else {
      return /^-?\d{1,6}$/.test(valueString);
    }
  }

  // Does not validate valueString. Both min and max are valid (closed interval)
  protected isValueInRange(valueString: string, min: number, max: number): boolean {
    if (valueString.toLowerCase().startsWith("h")) {
      const value = parseInt(valueString.slice(1), 16); // Remove "h"
      return (value >= min && value <= max);
    } else {
      const value = parseInt(valueString, 10);
      return (value >= min && value <= max);
    }
  }

  // Checks if string is a valid number for the machine
  protected isValidNBytesValue(valueString: string, n: number): boolean {
    if (n === 1) {
      return this.isValidValue(valueString, -128, 255);
    } else if (n === 2) {
      return this.isValidValue(valueString, -32768, 65535);
    } else {
      throw new Error("Invalid number of bytes: " + n);
    }
  }

  // TODO: Shouldn't it also allow positive offsets to overflow memory?
  protected isValidAddress(addressString: string): boolean { // Allows negative values for offsets
    return this.isValidValue(addressString, -this.machine.getMemorySize(), this.machine.getMemorySize() - 1);
  }

  protected isValidOrg(offsetString: string): boolean {
    return this.isValidValue(offsetString, 0, this.machine.getMemorySize() - 1);
  }

  protected splitArguments(args: string): { argumentList: string[], isAllocate: boolean } {
    const finalArgumentList: string[] = [];

    // Regular expressions
    const matchBrackets = new QRegExp("\\[(\\d+)\\]"); // Digits between brackets

    const VALUE = "([^'\\s,]+)";
    const STRING = "('[^']+')";
    const SEPARATOR = "([,\\s]*|$)";

    const matchArgumentString = "(" + VALUE + "|" + STRING + ")" + SEPARATOR;
    const matchArgument = new RegExp(matchArgumentString, "gi");

    args = args.trim(); // Trim whitespace

    //////////////////////////////////////////////////
    // Byte/Word allocation
    //////////////////////////////////////////////////

    if (matchBrackets.exactMatch(args)) {
      return { argumentList: [matchBrackets.cap(1)], isAllocate: true };
    }

    //////////////////////////////////////////////////
    // Process string
    //////////////////////////////////////////////////

    let currentMatch = matchArgument.exec(args);
    let totalMatchedLength = 0;

    while (currentMatch) { // While there are arguments
      let argument = currentMatch[1];

      // Ascii string
      if (argument.includes("'")) {
        argument = argument.replaceAll("'", "");
        for (const character of argument.split("")) {
          finalArgumentList.push(`'${character}'`); // Char between single quotes
        }
      } else { // Value
        finalArgumentList.push(argument);
      }

      totalMatchedLength += currentMatch[0].length;

      currentMatch = matchArgument.exec(args);
    }

    if (totalMatchedLength !== args.length) { // If not fully matched, an error occurred
      throw new AssemblerError(AssemblerErrorCode.INVALID_STRING);
    }

    return { argumentList: finalArgumentList, isAllocate: false };
  }

  protected extractArgumentAddressingModeCode(argument: string): { argument: string, addressingModeCode: AddressingModeCode } {
    let addressingModeCode = this.machine.getDefaultAddressingModeCode();

    for (const addressingMode of this.machine.getAddressingModes()) {
      const matchAddressingMode = addressingMode.getAssemblyRegExp();

      if (matchAddressingMode.exactMatch(argument)) {
        argument = matchAddressingMode.cap(1); // Remove addressing mode
        addressingModeCode = addressingMode.getAddressingModeCode();
        break;
      }
    }

    return { argument, addressingModeCode };
  }

  protected argumentToValue(argument: string, isImmediate: boolean, immediateNumBytes = 1): number {
    const matchChar = new QRegExp("'.'");
    const labelOffset = new QRegExp("(.+)(\\+|\\-)(.+)"); // (label) (+|-) (offset)

    // Convert label with +/- offset to number
    if (labelOffset.exactMatch(argument.toLowerCase())) {
      const sign = (labelOffset.cap(2) === "+") ? +1 : -1;

      if (!this.labelPCMap.has(labelOffset.cap(1))) { // Validate label's existence
        throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL); // TODO: Distinguish between not found vs invalid syntax?
      }
      if (!this.isValidAddress(labelOffset.cap(3))) { // Validate offset
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }

      // Argument = Label + Offset
      argument = String(this.labelPCMap.get(labelOffset.cap(1))! + sign * this.stringToInt(labelOffset.cap(3)));
    }

    // Convert label to number string
    if (this.labelPCMap.has(argument.toLowerCase())) {
      argument = String(this.labelPCMap.get(argument.toLowerCase()));
    }

    if (isImmediate) {
      if (argument.includes(Assembler.QUOTE_SYMBOL)) { // Immediate quote
        return "'".charCodeAt(0);
      } else if (matchChar.exactMatch(argument)) { // Immediate char
        return argument[1].charCodeAt(0); // TODO: Original (number)argument[1].toLatin1();
      } else if (this.isValidNBytesValue(argument, immediateNumBytes)) { // Immediate hex/dec value
        return this.stringToInt(argument);
      } else if (this.isValidValueFormat(argument)) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_VALUE);
      } else {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }
    } else {
      if (this.isValidAddress(argument)) { // Address
        return this.stringToInt(argument);
      } else if (this.isValidValueFormat(argument)) {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ADDRESS);
      } else if (this.isValidLabelFormat(argument) && argument.length > 1) { // Assume label unless single character
        throw new AssemblerError(AssemblerErrorCode.INVALID_LABEL);
      } else {
        throw new AssemblerError(AssemblerErrorCode.INVALID_ARGUMENT);
      }
    }
  }

  // TODO: Move to conversions?
  protected stringToInt(valueString: string): number {
    if (valueString.toLowerCase().startsWith("h")) {
      return parseInt(valueString.slice(1), 16); // Remove H
    } else {
      return parseInt(valueString, 10);
    }
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  // TODO: Currently unused
  public clear(): void {
    this.clearAssemblerData();
  }

  public getBuildSuccessful(): boolean {
    return this.buildSuccessful;
  }

  public getFirstErrorLine(): number {
    return this.firstErrorLine;
  }

  public getPCCorrespondingSourceLine(): number {
    return (this.addressCorrespondingSourceLine.at(this.pc.getValue()) ?? -1);
  }

  public getAddressCorrespondingSourceLine(address: number): number {
    return (this.buildSuccessful) ? (this.addressCorrespondingSourceLine[address] ?? -1) : -1;
  }

  public getSourceLineCorrespondingAddress(line: number): number {
    return (this.buildSuccessful) ? (this.sourceLineCorrespondingAddress[line] ?? -1) : -1;
  }

  public getAddressCorrespondingLabel(address: number): string {
    return (this.buildSuccessful) ? this.addressCorrespondingLabel[address] : "";
  }

  protected clearAssemblerData(): void {
    for (let i = 0; i < this.assemblerMemory.length; i++) {
      this.assemblerMemory[i].setValue(0);
      this.reserved[i] = false;
      this.addressCorrespondingSourceLine[i] = -1;
      this.setAddressCorrespondingLabel(i, "");
    }

    this.sourceLineCorrespondingAddress = [];
    this.labelPCMap.clear();
  }

  protected setAddressCorrespondingLabel(address: number, label: string): void {
    this.addressCorrespondingLabel[address] = label;
    this.publishEvent(`LABEL.${address}`, label);
  }

  protected getPCValue(): number {
    return this.pc.getValue();
  }

  protected setPCValue(value: number): void {
    this.pc.setValue(value);
  }

  protected incrementPCValue(units = 1): void {
    this.setPCValue(this.pc.getValue() + units);
  }

  //////////////////////////////////////////////////
  // Listeners
  //////////////////////////////////////////////////

  public subscribeToEvent(event: string, callback: EventCallback) {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] ?? [];
    this.eventSubscriptions[event].push(callback);
  }

  protected publishEvent(event: string, newValue: unknown, oldValue?: unknown) {
    this.eventSubscriptions[event]?.forEach(callback => callback(newValue, oldValue));
  }

}
