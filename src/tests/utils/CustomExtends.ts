/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-interface */
declare global {
  namespace jest {
    interface Expect extends CustomMatchers { }
    interface Matchers<R> extends CustomMatchers<R> { }
    interface InverseAsymmetricMatchers extends CustomMatchers { }
  }
}
/* eslint-enable */

interface CustomMatchers<R = unknown> {
  toDeepEqual(value: unknown, scenario: string): R;
}

expect.extend({
  // Add custom toDeepEqual so that "scenario" can be printed for every subtest
  toDeepEqual(received: unknown, expected: unknown, scenario: string) {
    let pass = true;
    let message = "";
    try {
      expect(received).toStrictEqual(expected);
    } catch (e) {
      pass = false;
      message = `${e}\n\nScenario: ${scenario.replaceAll("\n", "\n          ")}`;
    }
    return {
      pass,
      message: () => message,
      expected,
      received
    };
  }
});

export { };
