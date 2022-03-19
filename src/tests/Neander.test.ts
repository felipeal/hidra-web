import { FlagCode } from "../core/Flag";
import { Neander } from "../machines/Neander";

describe("Neander", () => {

  let neander: Neander;

  beforeEach(() => {
    neander = new Neander();
  });

  test("step: should increment pc", () => {
    expect(neander.getPCValue()).toBe(0);
    neander.step();
    expect(neander.getPCValue()).toBe(1);
  });

  test("step: should overflow to zero", () => {
    neander.setPCValue(255);
    neander.step();
    expect(neander.getPCValue()).toBe(0);
  });

  test("step: should increment PC for 2-byte instructions", () => {
    expect(neander.getPCValue()).toBe(0);
    neander.setMemoryValue(0, 48); // ADD
    neander.step();
    expect(neander.getPCValue()).toBe(2);
  });

  test("NOP: should only advance PC", () => {
    neander.step();
    expect(neander.getPCValue()).toBe(1);
  });

  test("ADD: should add value to accumulator", () => {
    // memory[0..1] = ADD 128
    neander.setMemoryValue(0, 48);
    neander.setMemoryValue(1, 128);

    // memory[128] = 2
    neander.setMemoryValue(128, 2);
    neander.setRegisterValueByName("AC", 3);
    neander.step();

    expect(neander.getRegisterValueByName("AC")).toBe(5);
  });

  test("JZ: Should jump if Z = true", () => {
    // memory[0..1] = JZ 128
    neander.setMemoryValue(0, 160);
    neander.setMemoryValue(1, 128);

    neander.step();

    expect(neander.getPCValue()).toBe(128);
  });

  test("JZ: Should not jump if Z = false", () => {
    // memory[0..1] = JZ 128
    neander.setMemoryValue(0, 160);
    neander.setMemoryValue(1, 128);

    neander.setFlagValueByFlagCode(FlagCode.ZERO, false);
    neander.step();

    expect(neander.getPCValue()).toBe(2);
  });

});
