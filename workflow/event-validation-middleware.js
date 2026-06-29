const fs = require("fs");
const path = require("path");

function createEventValidationMiddleware(schemaRegistry, invalidEventLogPath) {
  const ajv = schemaRegistry.getAjvInstance();

  // Ensure the log directory exists
  const logDir = path.dirname(invalidEventLogPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return (eventType, payload, next) => {
    const eventVersion = payload.schemaVersion || "1.0"; // Assume payload has a schemaVersion field
    const schema = schemaRegistry.getSchema(eventType, eventVersion);

    if (!schema) {
      console.warn(
        `EventValidationMiddleware: No schema found for eventType: ${eventType}, version: ${eventVersion}. Skipping validation.`
      );
      return next(eventType, payload); // Fail-safe: proceed without validation
    }

    const validate = ajv.getSchema(`${eventType}-${eventVersion}`);
    if (!validate) {
      console.error(
        `EventValidationMiddleware: Compiled schema not found in AJV for ${eventType}-${eventVersion}. This should not happen if schemaRegistry is initialized correctly.`
      );
      // Attempt to compile on the fly if not found (should be pre-compiled)
      try {
        ajv.addSchema(schema, `${eventType}-${eventVersion}`);
        validate = ajv.getSchema(`${eventType}-${eventVersion}`);
      } catch (e) {
        console.error(
          `EventValidationMiddleware: Error compiling schema for ${eventType}-${eventVersion}: ${e.message}`
        );
        return next(eventType, payload); // Proceed without validation on compilation error
      }
    }

    const isValid = validate(payload);

    if (isValid) {
      return next(eventType, payload);
    } else {
      const invalidRecord = {
        timestamp: new Date().toISOString(),
        eventType,
        payload,
        validationErrors: validate.errors
      };
      fs.appendFileSync(invalidEventLogPath, JSON.stringify(invalidRecord) + "\n");
      console.warn(
        `EventValidationMiddleware: Invalid event quarantined: ${eventType}. Errors logged to ${invalidEventLogPath}`
      );
      // Do NOT call next() for invalid events; stop propagation
      return { stopPropagation: true };
    }
  };
}

module.exports = createEventValidationMiddleware;
