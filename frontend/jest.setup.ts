// Suppress JSDOM VirtualConsole navigation warnings
// These are expected warnings from JSDOM when testing navigation-related code
const originalError = console.error;
const originalWarn = console.warn;

// Suppress console.error and console.warn for JSDOM navigation warnings
const suppressedMessages = [
  "Not implemented: navigation",
  "navigation (except hash changes)",
];

const shouldSuppress = (...args: unknown[]): boolean => {
  const firstArg = args[0];
  const message =
    typeof firstArg === "string" ? firstArg : String(args.join(" "));

  return (
    suppressedMessages.some((msg) => message.includes(msg)) ||
    (firstArg !== null &&
      typeof firstArg === "object" &&
      "type" in firstArg &&
      firstArg.type === "not implemented")
  );
};

console.error = jest.fn((...args) => {
  if (shouldSuppress(...args)) {
    return;
  }
  originalError.call(console, ...args);
});

console.warn = jest.fn((...args) => {
  if (shouldSuppress(...args)) {
    return;
  }
  originalWarn.call(console, ...args);
});
