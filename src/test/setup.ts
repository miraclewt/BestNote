import '@testing-library/jest-dom';

// jsdom doesn't implement scrollIntoView — provide a no-op stub
window.HTMLElement.prototype.scrollIntoView = function () {};

// jsdom doesn't implement Range.getBoundingClientRect — provide a stub
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = function () {
    return new DOMRect(100, 200, 50, 20);
  };
}
