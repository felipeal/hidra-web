export class Byte {

  private value: number;

  constructor(value = 0) {
    this.value = (value & 0xFF); // TODO: Review
  }

  public getValue(): number {
    return this.value;
  }

  public setValue(value: number): void {
    this.value = (value & 0xFF);
  }

}
