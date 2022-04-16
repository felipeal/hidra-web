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

export default { };
