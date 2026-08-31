import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrollIntoView; MessageList calls it on every update.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
