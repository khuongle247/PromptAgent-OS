const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

class EventSchemaRegistry {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(this.ajv);
    this.schemas = new Map(); // Map<eventType, Map<version, schemaObject>>
    this.defaultVersions = new Map(); // Map<eventType, defaultVersionString>
  }

  initialize(rootDir, schemasDir) {
    const fullSchemasDirPath = path.join(rootDir, schemasDir);
    if (!fs.existsSync(fullSchemasDirPath)) {
      console.warn(`EventSchemaRegistry: Schemas directory not found: ${fullSchemasDirPath}`);
      return;
    }

    const schemaFiles = fs.readdirSync(fullSchemasDirPath).filter(f => f.endsWith(".schema.json"));

    for (const file of schemaFiles) {
      const filePath = path.join(fullSchemasDirPath, file);
      try {
        const schema = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const eventTypeMatch = file.match(/^([a-zA-Z-]+?)(?:-v(\d+\.\d+))?\.schema\.json$/);

        if (eventTypeMatch) {
          const eventType = eventTypeMatch[1];
          const version = eventTypeMatch[2] || "1.0"; // Default to 1.0 if no version in filename

          if (!this.schemas.has(eventType)) {
            this.schemas.set(eventType, new Map());
          }
          this.schemas.get(eventType).set(version, schema);

          // Set default version if it's the highest encountered or first one
          const currentDefault = this.defaultVersions.get(eventType);
          if (!currentDefault || this._compareVersions(version, currentDefault) > 0) {
            this.defaultVersions.set(eventType, version);
          }
          this.ajv.addSchema(schema, `${eventType}-${version}`); // Register with AJV for $ref resolution
        } else {
          console.warn(
            `EventSchemaRegistry: Could not parse eventType and version from filename: ${file}`
          );
        }
      } catch (error) {
        console.error(`EventSchemaRegistry: Failed to load schema from ${file}: ${error.message}`);
      }
    }
    console.log(`EventSchemaRegistry: Loaded ${this.schemas.size} event types.`);
  }

  _compareVersions(v1, v2) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  getSchema(eventType, version) {
    const eventTypeSchemas = this.schemas.get(eventType);
    if (!eventTypeSchemas) {
      return null;
    }

    if (version) {
      return eventTypeSchemas.get(version) || null;
    } else {
      // Return the default (latest) version
      const defaultVersion = this.defaultVersions.get(eventType);
      return eventTypeSchemas.get(defaultVersion) || null;
    }
  }

  registerSchema(eventType, version, schema) {
    if (!this.schemas.has(eventType)) {
      this.schemas.set(eventType, new Map());
    }
    this.schemas.get(eventType).set(version, schema);
    this.ajv.addSchema(schema, `${eventType}-${version}`);

    const currentDefault = this.defaultVersions.get(eventType);
    if (!currentDefault || this._compareVersions(version, currentDefault) > 0) {
      this.defaultVersions.set(eventType, version);
    }
  }

  getAjvInstance() {
    return this.ajv;
  }
}

module.exports = EventSchemaRegistry;
