import { Register } from "./Register";
import { Flag, FlagCode } from "./Flag";
import { Instruction } from "./Instruction";
import { AddressingMode, AddressingModeCode } from "./AddressingMode";
import { Byte } from "./Byte";
import { Conversion } from "./Conversion";
import { buildArray, EventCallback, Q_ASSERT, validateSize } from "./Utils";

interface MachineSettings {
  name: string,
  identifier: string,
  memorySize: number,
  flags: Flag[],
  registers: Register[],
  instructions: Instruction[],
  addressingModes: AddressingMode[],
  littleEndian?: boolean
}

export abstract class MachineState {

  // Machine setttings (always provided in constructor)
  private name!: string;
  private identifier!: string;
  private memorySize!: number;
  private flags!: Flag[];
  private registers!: Register[];
  private instructions!: Instruction[];
  private addressingModes!: AddressingMode[];
  private littleEndian: boolean;

  private pc: Register;
  private memory: Byte[] = [];
  private instructionStrings: string[] = [];
  private changed: boolean[] = [];
  private running = false;
  private breakpoint = -1;
  private instructionCount = 0;
  private accessCount = 0;
  private memoryMask!: number; // Memory address mask, populated by setMemorySize
  private eventSubscriptions: Record<string, EventCallback[]> = {};

  constructor(settings: MachineSettings) {
    // Assign settings
    Object.assign(this, settings);
    this.setMemorySize(settings.memorySize);
    this.littleEndian = settings.littleEndian ?? false;

    this.pc = this.registers.find(register => register.getName() === "PC")!;
    Q_ASSERT(Boolean(this.pc), "Register PC not found.");
  }

  //////////////////////////////////////////////////
  // Accessors
  //////////////////////////////////////////////////

  public getName(): string {
    return this.name;
  }

  public getIdentifier(): string {
    return this.identifier;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public setRunning(running: boolean): void {
    this.running = running;
  }

  public getBreakpoint(): number {
    return this.breakpoint;
  }

  public setBreakpoint(value: number): void {
    if (value >= this.memory.length || value < 0) {
      this.breakpoint = -1;
    } else {
      this.breakpoint = value;
    }
  }

  public getMemory(): ReadonlyArray<Byte> {
    return this.memory;
  }

  public getMemorySize(): number {
    return this.memorySize;
  }

  protected setMemorySize(size: number): void {
    validateSize(size);
    this.memorySize = size;

    this.memory = buildArray(size, () => new Byte());
    this.instructionStrings = new Array(size).fill("");
    this.changed = new Array(size).fill(true);
    this.memoryMask = (size - 1);
  }

  public getMemoryValue(address: number): number {
    return this.memory[address & this.memoryMask].getValue();
  }

  public setMemoryValue(address: number, value: number): void {
    const validAddress = address & this.memoryMask;

    this.memory[validAddress].setValue(value);
    this.changed[validAddress] = true;
    this.publishEvent(`MEM.${address}`, this.memory[validAddress].getValue());
  }

  // Has byte changed last look-up
  public hasByteChanged(address: number): boolean {
    if (this.changed[address & this.memoryMask]) {
      this.changed[address & this.memoryMask] = false;
      return true;
    } else {
      return false;
    }
  }

  public clearMemory(): void {
    for (let i = 0; i < this.memory.length; i++) {
      this.setMemoryValue(i, 0);
    }
  }

  public getInstructionString(address: number): string {
    return this.instructionStrings[address & this.memoryMask];
  }

  protected setInstructionString(address: number, str: string): void {
    this.instructionStrings[address & this.memoryMask] = str;
    this.publishEvent(`INS.STR.${address}`, str);
  }

  public clearInstructionStrings(): void {
    for (let i = 0; i < this.instructionStrings.length; i++) {
      this.setInstructionString(i, "");
    }
  }

  public getNumberOfFlags(): number {
    return this.flags.length;
  }

  public getFlags(): ReadonlyArray<Flag> {
    return this.flags;
  }

  public getFlagName(id: number): string {
    return this.flags[id].getName();
  }

  public getFlagValueById(id: number): boolean {
    return this.flags[id].getValue();
  }

  public getFlagValueByName(flagName: string): boolean {
    for (const flag of this.flags) {
      if (flag.getName() === flagName) {
        return flag.getValue();
      }
    }

    throw new Error(`Invalid flag name: ${flagName}`);
  }

  public setFlagValueById(id: number, value: boolean): void {
    this.flags[id].setValue(value);
    this.publishEvent(`FLAG.${this.flags[id].getName()}`, value);
  }

  public setFlagValueByName(flagName: string, value: boolean): void {
    for (const flag of this.flags) {
      if (flag.getName() === flagName) {
        flag.setValue(value);
        this.publishEvent(`FLAG.${flag.getName()}`, value);
        return;
      }
    }

    throw new Error(`Invalid flag name: ${flagName}`);
  }

  public setFlagValueByFlagCode(flagCode: FlagCode, value: boolean): void {
    for (const flag of this.flags) {
      if (flag.getFlagCode() === flagCode) {
        flag.setValue(value);
        this.publishEvent(`FLAG.${flag.getName()}`, value);
      }
    }
  }

  public clearFlags(): void {
    for (const flag of this.flags) {
      flag.resetValue();
      this.publishEvent(`FLAG.${flag.getName()}`, flag.getValue());
    }
  }

  public hasFlag(flagCode: FlagCode): boolean { // TODO: Use get by flag code
    for (const flag of this.flags) {
      if (flag.getFlagCode() === flagCode) {
        return true;
      }
    }

    return false;
  }

  public getNumberOfRegisters(): number {
    return this.registers.length;
  }

  public getRegisters(): ReadonlyArray<Register> {
    return this.registers;
  }

  // -1 if no code
  public getRegisterBitCode(registerName: string): number {
    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return register.getBitCode();
      }
    }

    return Register.NO_BIT_CODE; // Register not found
  }

  public getRegisterName(id: number): string {
    const name = this.registers[id].getName();

    if (name !== "") {
      return name;
    } else {
      return "R" + String(id); // Default to R0..R63
    }
  }

  public hasRegister(registerName: string): boolean {
    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  public getRegisterValueById(id: number, signedData = false): number {
    if (signedData && this.registers[id].isData()) {
      return this.registers[id].getSignedValue();
    } else {
      return this.registers[id].getValue();
    }
  }

  public getRegisterValueByName(registerName: string): number {
    if (registerName === "") { // Undefined register
      return 0;
    }

    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        return register.getValue();
      }
    }

    throw new Error(`Invalid register name: ${registerName}`);
  }

  public setRegisterValueById(id: number, value: number): void {
    const register = this.registers[id];
    const oldValue = register.getValue();
    register.setValue(value);
    this.publishEvent(`REG.${register.getName()}`, register.getValue(), oldValue);
  }

  public setRegisterValueByName(registerName: string, value: number): void {
    if (registerName === "") { // Undefined register
      return;
    }

    for (const register of this.registers) {
      if (register.getName().toLowerCase() === registerName.toLowerCase()) {
        const oldValue = register.getValue();
        register.setValue(value);
        this.publishEvent(`REG.${registerName}`, register.getValue(), oldValue);
        return;
      }
    }

    throw new Error(`Invalid register name: ${registerName}`);
  }

  public isRegisterData(id: number): boolean {
    return this.registers[id].isData();
  }

  public clearRegisters(): void {
    for (const register of this.registers) {
      const oldValue = register.getValue();
      register.setValue(0);
      this.publishEvent(`REG.${register.getName()}`, 0, oldValue);
    }
  }

  public getPCName(): string {
    return this.pc.getName();
  }

  public getPCValue(): number {
    return this.pc.getValue();
  }

  public setPCValue(value: number): void {
    const oldValue = this.pc.getValue();
    this.pc.setValue(value);
    this.publishEvent(`REG.${this.pc.getName()}`, this.pc.getValue(), oldValue);
  }

  public incrementPCValue(units = 1): void {
    this.setPCValue(this.pc.getValue() + units);
  }

  public getPCNumberOfBits() {
    return this.pc.getNumberOfBits();
  }

  public getInstructions(): ReadonlyArray<Instruction> {
    return this.instructions;
  }

  public getInstructionFromValue(value: number): Instruction | null {
    for (const instruction of this.instructions) {
      if (instruction.matchByte(value)) {
        return instruction;
      }
    }

    return null;
  }

  public getInstructionFromMnemonic(mnemonic: string): Instruction | null {
    for (const instruction of this.instructions) {
      if (instruction.getMnemonic() === mnemonic) {
        return instruction;
      }
    }

    return null;
  }

  public getAddressingModes(): ReadonlyArray<AddressingMode> {
    return this.addressingModes;
  }

  public getDefaultAddressingModeCode(): AddressingModeCode {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAssemblyPattern() === AddressingMode.NO_PATTERN) {
        return addressingMode.getAddressingModeCode();
      }
    }

    throw new Error("No default addressing mode found.");
  }

  public getAddressingModeBitCode(addressingModeCode: AddressingModeCode): number {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAddressingModeCode() === addressingModeCode) {
        return Conversion.stringToValue(addressingMode.getBitPattern());
      }
    }

    throw new Error(`Invalid addressing mode code: ${addressingModeCode}`);
  }

  public getAddressingModePattern(addressingModeCode: AddressingModeCode): string {
    for (const addressingMode of this.addressingModes) {
      if (addressingMode.getAddressingModeCode() === addressingModeCode) {
        return addressingMode.getAssemblyPattern();
      }
    }

    return ""; // TODO: Throw?
  }

  public isLittleEndian(): boolean {
    return this.littleEndian;
  }

  public getInstructionCount(): number {
    return this.instructionCount;
  }

  public incrementInstructionCount() {
    this.instructionCount++;
    this.publishEvent("INS.COUNT", this.instructionCount);
  }

  public getAccessCount(): number {
    return this.accessCount;
  }

  public incrementAccessCount() {
    this.accessCount++;
    this.publishEvent("ACC.COUNT", this.accessCount);
  }

  public clearCounters(): void {
    this.instructionCount = 0;
    this.accessCount = 0;
    this.publishEvent("INS.COUNT", this.instructionCount);
    this.publishEvent("ACC.COUNT", this.accessCount);
  }

  public clear(): void {
    this.clearMemory();
    this.clearRegisters();
    this.clearFlags();
    this.clearCounters();
    this.clearInstructionStrings();

    this.setBreakpoint(-1);
    this.setRunning(false);

    throw new Error("Reminder: assemblerData must also be cleared."); // TODO: Untested
  }

  public clearAfterBuild(): void {
    this.clearRegisters();
    this.clearFlags();
    this.clearCounters();
    this.clearInstructionStrings();

    this.setRunning(false);
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
