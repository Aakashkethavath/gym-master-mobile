/**
 * Wraps an async Express handler so rejected promises forward to the
 * centralized error middleware instead of crashing the process.
 *
 * @param {(req, res, next) => Promise<unknown>} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
