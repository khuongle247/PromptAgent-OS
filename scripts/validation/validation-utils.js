const fs = require("fs");
const path = require("path");

let ajv = null;

try {
  const Ajv = require("ajv");
  const addFormats = require("ajv-formats");

  ajv = new Ajv({
    allErrors: true
  });

  addFormats(ajv);
} catch (error) {
  ajv = null;
}

// ======================================
// FILE HELPERS
// ======================================

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonSafe(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
  } catch (error) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readTextSafe(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch (error) {
    return "";
  }
}

// ======================================
// REPORT HELPERS
// ======================================

function createReport(projectName) {
  return {
    project: projectName,
    status: "PASS",
    score: 100,
    errors: [],
    warnings: [],
    generatedAt: new Date().toISOString()
  };
}

function addError(report, message) {
  report.errors.push(message);
}

function addWarning(report, message) {
  report.warnings.push(message);
}

// ======================================
// SCHEMA
// ======================================

function loadSchema(rootDir, schemaName) {
  const filePath = path.join(rootDir, "schemas", schemaName);

  return readJson(filePath);
}

function validateSchema(data, schema) {
  if (!ajv) {
    return validateSchemaFallback(data, schema);
  }

  const validate = ajv.compile(schema);

  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || []
  };
}

function getType(value) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function createSchemaError(instancePath, message) {
  return {
    instancePath,
    message
  };
}

function validateNode(value, schema, instancePath, errors) {
  if (!schema) {
    return;
  }

  if (schema.type && getType(value) !== schema.type) {
    errors.push(createSchemaError(instancePath, `must be ${schema.type}`));

    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(createSchemaError(instancePath, "must be equal to one of the allowed values"));
  }

  if (
    schema.minLength !== undefined &&
    typeof value === "string" &&
    value.length < schema.minLength
  ) {
    errors.push(
      createSchemaError(instancePath, `must NOT have fewer than ${schema.minLength} characters`)
    );
  }

  if (schema.minItems !== undefined && Array.isArray(value) && value.length < schema.minItems) {
    errors.push(
      createSchemaError(instancePath, `must NOT have fewer than ${schema.minItems} items`)
    );
  }

  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(createSchemaError(instancePath, `must match pattern "${schema.pattern}"`));
  }

  if (schema.minimum !== undefined && typeof value === "number" && value < schema.minimum) {
    errors.push(createSchemaError(instancePath, `must be >= ${schema.minimum}`));
  }

  if (schema.maximum !== undefined && typeof value === "number" && value > schema.maximum) {
    errors.push(createSchemaError(instancePath, `must be <= ${schema.maximum}`));
  }

  if (schema.required && value && typeof value === "object" && !Array.isArray(value)) {
    schema.required.forEach(field => {
      if (value[field] === undefined) {
        errors.push(createSchemaError(instancePath, `must have required property '${field}'`));
      }
    });
  }

  if (schema.properties && value && typeof value === "object" && !Array.isArray(value)) {
    Object.keys(schema.properties).forEach(key => {
      if (value[key] !== undefined) {
        validateNode(value[key], schema.properties[key], `${instancePath}/${key}`, errors);
      }
    });
  }

  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      validateNode(item, schema.items, `${instancePath}/${index}`, errors);
    });
  }
}

function validateSchemaFallback(data, schema) {
  const errors = [];

  validateNode(data, schema, "", errors);

  return {
    valid: errors.length === 0,
    errors
  };
}

// ======================================
// REPORT FINALIZE
// ======================================

function finalizeReport(report) {
  report.score -= report.errors.length * 10;

  report.score -= report.warnings.length * 2;

  if (report.score < 0) {
    report.score = 0;
  }

  if (report.errors.length > 0) {
    report.status = "FAIL";
  } else if (report.warnings.length > 0) {
    report.status = "WARNING";
  }

  return report;
}

module.exports = {
  exists,
  readJson,
  readJsonSafe,
  writeJson,
  readText,
  readTextSafe,

  createReport,
  addError,
  addWarning,

  loadSchema,
  validateSchema,

  finalizeReport
};
