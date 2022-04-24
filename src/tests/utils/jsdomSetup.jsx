import React from "react";

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

// Mock AutoSizer component
jest.mock(
  "react-virtualized-auto-sizer",
  () => ({ children }) => children({ height: 480, width: 640 })
);

// Mock FixedSizeList component
jest.mock(
  "react-window", () => ({
    // eslint-disable-next-line react/prop-types
    FixedSizeList: ({ children }) => (<>
      {[...Array(8).keys()].map(n => children({ index: n }))}
    </>)
  })
);

export default { };
