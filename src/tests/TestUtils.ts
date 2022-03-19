expect.extend({
  toDeepEqual(received: unknown, expected: unknown, scenario: string) {
    let pass = true;
    let message = "";
    try {
      expect(received).toStrictEqual(expected);
    } catch (e) {
      pass = false;
      message = `${e}\n\nScenario: ${scenario}`;
    }
    return {
      pass,
      message: () => message,
      expected,
      received
    };
  }
});

interface CustomMatchers<R = unknown> {
  toDeepEqual(value: unknown, scenario: string): R;
}

declare global {
  // eslint-disable-next-line
  namespace jest {
    // eslint-disable-next-line
    interface Expect extends CustomMatchers {}
    // eslint-disable-next-line
    interface Matchers<R> extends CustomMatchers<R> {}
    // eslint-disable-next-line
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

export {};
