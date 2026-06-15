/**
 * Validates the request against a Zod schema. The schema receives an
 * object with `body`, `params`, and `query` keys. After a successful
 * parse we replace the originals with the parsed (and coerced) values
 * so downstream handlers can rely on the schema's types.
 *
 * @param {import('zod').ZodSchema} schema
 */
export const validate = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;
    if (parsed.query) req.query = parsed.query;
    next();
  } catch (err) {
    next(err);
  }
};
