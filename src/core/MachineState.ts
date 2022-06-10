import { Register, RegisterInfo } from "./Register";
import { Flag, FlagCode } from "./Flag";
import { Instruction } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { Byte } from "./Byte";
import { buildArray, range, assert, isPowerOfTwo } from "./utils/FunctionUtils";
import { EventCallback, UnsubscribeCallback } from "./utils/EventUtils";
import { bitPatternToUnsignedByte } from "./utils/Conversions";

interface MachineSettings {
  name: string,
  identifier: string,
  fileExtension: string,
  memorySize: number,
  flags: Flag[],
  registers: Register[],
  instructions: Instruction[],
  addressingModes: AddressingMode[],

  // Settings with default values
  littleEndian?: boolean,
  pcName?: string,
  immediateNumBytes?: number
}

export abstract class MachineState {

  // Machine setttings (always assigned in constructor)
  private name!: string;
  private identifier!: string;
  private fileExtension!: string;
  private memorySize!: number;
  private flags!: Flag[];
  private registers!: Register[];
  private instructions!: Instruction[];
  private addressingModes!: AddressingMode[];

  // Machine settings with default values
  private littleEndian = false;
  private pcName = "PC";
  private immediateNumBytes = 1;

  private pc: Register;
  private memory: Byte[] = [];
  private instructionStrings: string[] = [];
  private running = false;
  private instructionCount = 0;
  private accessCount = 0;
  private memoryMask!: number; // Memory address mask, populated by setMemorySize

  private eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(settings: MachineSettings) {
    // Assign settings
    Object.assign(this, settings);
    this.setMemorySize(settings.memorySize);

    this.pc = this.registers.find(register => register.getName() === this.getPCName())!;
    assert(this.pc, `Register ${this.getPCName()} not found.`);
  }

  //////////////////////////////////////////////////
  // Characteristics
  //////////////////////////////////////////////////

  public getName(): string {
    return this.name;
  }

  public getIdentifier(): string {
    return this.identifier;
  }

  public getFileExtension(): string {
    return this.fileExtension;
  }

  public isLittleEndian(): boolean {
    return this.littleEndian;
  }

  public getImmediateNumBytes(): number {
    return this.immediateNumBytes;
  }

  //////////////////////////////////////////////////
  // Running state
  //////////////////////////////////////////////////

  public isRunning(): boolean {
    return this.running;
  }

  public setRunning(running: boolean): void {
    this.running = running;
    this.publishEvent("RUNNING", running);
  }

  //////////////////////////////////////////////////
  // Memory
  //////////////////////////////////////////////////

  public getMemory(): ReadonlyArray<Byte> {
    return this.memory;
  }

  public getMemorySize(): number {
    return this.memorySize;
  }

  protected setMemorySize(size: number): void {
    assert(isPowerOfTwo(size), `Memory size must be a power of two: ${size}`);
    this.memorySize = size;

    this.memory = buildArray(size, () => new Byte());
    this.instructionStrings = new Array(size).fill("");
    this.memoryMask = (size - 1);
  }

  public getMemoryValue(address: number): number {
    return this.memory[this.toValidAddress(address)].getValue();
  }

  public setMemoryValue(address: number, value: number): void {
    const validAddress = this.toValidAddress(address);

    this.memory[validAddress].setValue(value);
    this.publishEvent(`MEM.${address}`, this.memory[validAddress].getValue());
  }

  public setMemoryValues(values: number[]): void {
    assert((values.length === this.memorySize), `Invalid array size for setMemoryValues: ${values.length}`);
    for (const address of range(this.memorySize)) {
      this.setMemoryValue(address, values[address]);
    }
  }

  // Returns a valid address, removing excess bits
  public toValidAddress(value: number): number {
    return (value & this.memoryMask);
  }

  //////////////////////////////////////////////////
  // Disassembler (instruction strings)
  //////////////////////////////////////////////////

  public getInstructionString(address: number): string {
    return this.instructionStrings[this.toValidAddress(address)];
  }

  protected setInstructionString(address: number, str: string): void {
    const validAddress = this.toValidAddress(address);
    this.instructionStrings[validAddress] = str;
    this.publishEvent(`INS.STR.${validAddress}`, str);
  }

  protected clearInstructionStrings(): void {
    for (const address of range(this.instructionStrings.length)) {
      this.setInstructionString(address, "");
    }
  }

  //////////////////////////////////////////////////
  // Flags
  //////////////////////////////////////////////////

  public getFlags(): ReadonlyArray<Flag> {
    return this.flags;
  }

  public isFlagTrue(flagName: string): boolean {
    const flag = this.flags.find(flag => flag.getName() === flagName);
    assert(flag, `Invalid flag name: ${flagName}`);
    return flag.getValue();
  }

  public isFlagFalse(flagName: string): boolean {
    return !this.isFlagTrue(flagName);
  }

  public getFlagBit(flagName: string): number {
    return this.isFlagTrue(flagName) ? 1 : 0;
  }

  public setFlagValue(flagName: string, value: boolean): void {
    const flag = this.flags.find(flag => flag.getName() === flagName);
    assert(flag, `Invalid flag name: ${flagName}`);

    flag.setValue(value);
    this.publishEvent(`FLAG.${flagName}`, value);
  }

  protected setFlagValueByFlagCode(flagCode: FlagCode, value: boolean): void {
    const flag = this.flags.find(flag => flag.getFlagCode() === flagCode);
    if (!flag) {
      return; // Flag type not available, safe to skip
    }

    this.setFlagValue(flag.getName(), value);
  }

  protected resetFlags(): void {
    for (const flag of this.flags) {
      this.setFlagValue(flag.getName(), flag.getDefaultValue());
    }
  }

  public hasFlag(flagCode: FlagCode): boolean {
    return this.flags.some(flag => flag.getFlagCode() === flagCode);
  }

  //////////////////////////////////////////////////
  // Registers
  //////////////////////////////////////////////////

  public getRegisters(): ReadonlyArray<Register> {
    return this.registers;
  }

  // Returns Register.NO_BIT_CODE if no code
  public getRegisterBitCode(registerName: string): number {
    const register = this.registers.find(register => register.getName().toLowerCase() === registerName.toLowerCase());
    if (!register) {
      return Register.NO_BIT_CODE; // Register not found
    }

    return register.getBitCode();
  }

  public getRegisterInfo(registerName: string): RegisterInfo {
    const register = this.registers.find(register => register.getName().toLowerCase() === registerName.toLowerCase());
    assert(register, `Invalid register name: ${registerName}`);
    return register.getInfo();
  }

  public getRegisterValue(registerName: string): number {
    if (registerName === "") { // Undefined register
      return 0;
    }

    const register = this.registers.find(register => register.getName().toLowerCase() === registerName.toLowerCase());
    assert(register, `Invalid register name: ${registerName}`);
    return register.getValue();
  }

  public setRegisterValue(registerName: string, value: number): void {
    if (registerName === "") { // Undefined register
      return;
    }

    const register = this.registers.find(register => register.getName().toLowerCase() === registerName.toLowerCase());
    assert(register, `Invalid register name: ${registerName}`);

    register.setValue(value);
    this.publishEvent(`REG.${registerName}`, register.getValue());
  }

  protected clearRegisters(): void {
    for (const register of this.registers) {
      this.setRegisterValue(register.getName(), 0);
    }
  }

  public hasRegister(registerName: string): boolean {
    return this.registers.some(register => register.getName().toLowerCase() === registerName.toLowerCase());
  }

  //////////////////////////////////////////////////
  // PC
  //////////////////////////////////////////////////

  public getPCName(): string {
    return this.pcName;
  }

  public getPCValue(): number {
    return this.pc.getValue();
  }

  public setPCValue(value: number): void {
    this.setRegisterValue(this.pc.getName(), value);
  }

  protected incrementPCValue(units = 1): void {
    this.setPCValue(this.pc.getValue() + units);
  }

  //////////////////////////////////////////////////
  // Instructions / Addressing Modes
  //////////////////////////////////////////////////

  public getInstructions(): ReadonlyArray<Instruction> {
    return this.instructions;
  }

  protected getInstructionFromValue(value: number): Instruction | null {
    return this.instructions.find(instruction => instruction.matchByte(value)) || null;
  }

  public getInstructionFromMnemonic(mnemonic: string): Instruction | null {
    return this.instructions.find(instruction => instruction.getMnemonic() === mnemonic) || null;
  }

  public getAddressingModes(): ReadonlyArray<AddressingMode> {
    return this.addressingModes;
  }

  public getDefaultAddressingModeCode(): AddressingModeCode {
    const defaultAddressingMode = this.addressingModes.find(
      addressingMode => addressingMode.getAssemblyPattern() === AddressingMode.NO_PATTERN
    );
    assert(defaultAddressingMode, "No default addressing mode found.");
    return defaultAddressingMode.getAddressingModeCode();
  }

  public getAddressingModeBitCode(addressingModeCode: AddressingModeCode): number {
    const addressingMode = this.addressingModes.find(addressingMode => addressingMode.getAddressingModeCode() === addressingModeCode);
    assert(addressingMode, `Invalid addressing mode code: ${addressingModeCode}`);
    return bitPatternToUnsignedByte(addressingMode.getBitPattern());
  }

  public getAddressingModePattern(addressingModeCode: AddressingModeCode): string {
    const addressingMode = this.addressingModes.find(addressingMode => addressingMode.getAddressingModeCode() === addressingModeCode);
    assert(addressingMode, `Invalid addressing mode code: ${addressingModeCode}`);
    return addressingMode.getAssemblyPattern();
  }

  //////////////////////////////////////////////////
  // Counters
  //////////////////////////////////////////////////

  public getInstructionCount(): number {
    return this.instructionCount;
  }

  protected incrementInstructionCount(): void {
    this.setInstructionCount(this.instructionCount + 1);
  }

  private setInstructionCount(value: number): void {
    this.instructionCount = value;
    this.publishEvent("INS.COUNT", this.instructionCount);
  }

  public getAccessCount(): number {
    return this.accessCount;
  }

  protected incrementAccessCount(): void {
    this.setAccessCount(this.accessCount + 1);
  }

  private setAccessCount(value: number): void {
    this.accessCount = value;
    this.publishEvent("ACC.COUNT", this.accessCount);
  }

  public clearCounters(): void {
    this.setInstructionCount(0);
    this.setAccessCount(0);
  }

  //////////////////////////////////////////////////
  // Events
  //////////////////////////////////////////////////

  // Returns unsubscribe callback
  public subscribeToEvent(event: string, callback: EventCallback): UnsubscribeCallback {
    this.eventSubscriptions[event] = this.eventSubscriptions[event] ?? [];
    this.eventSubscriptions[event].push(callback);
    return () => this.eventSubscriptions[event] = this.eventSubscriptions[event].filter((f) => f !== callback);
  }

  protected publishEvent(event: string, value: unknown): void {
    this.eventSubscriptions[event]?.forEach(callback => callback(value));
  }

}
