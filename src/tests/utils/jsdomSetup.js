import { TextEncoder, TextDecoder } from "util";

// Always use fake timers
jest.useFakeTimers();

// Fix getBoundingClientRect errors
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  range.getClientRects = jest.fn(() => ({ item: () => null, length: 0 }));
  return range;
};

// Fix scrollTo errors
Element.prototype.scrollTo = () => {/* */};

// TextEncoder/TextDecoder support
global.TextEncoder = TextEncoder; // eslint-disable-line no-undef
global.TextDecoder = TextDecoder; // eslint-disable-line no-undef

export default { };
