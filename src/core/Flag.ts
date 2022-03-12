export enum FlagCode {
  NEGATIVE, ZERO, CARRY, BORROW, OVERFLOW_FLAG
}

export class Flag {

  constructor(flagCode: FlagCode, name: string, defaultValue = false) {
    this.flagCode = flagCode;
    this.name = name;
    this.value = defaultValue;
    this.defaultValue = defaultValue;
  }

  public getFlagCode(): FlagCode {
    return this.flagCode;
  }

  public getName(): string {
    return this.name;
  }

  public getValue(): boolean {
    return this.value;
  }

  public setValue(value: boolean): void {
    this.value = value;
  }

  public resetValue(): void {
    this.value = this.defaultValue;
  }

  flagCode: FlagCode;
  name: string;
  value: boolean;
  defaultValue: boolean;
}
