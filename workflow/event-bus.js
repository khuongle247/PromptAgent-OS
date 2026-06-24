const fs = require("fs");
const path = require("path");

// New imports for Event Validation Layer
const EventSchemaRegistry = require("./event-schema-registry");
const createEventValidationMiddleware = require("./event-validation-middleware");

class EventBus {
  constructor() {
    this.subscribers = new Map(); // Map<eventType, Set<Function>>
    this.middleware = []; // Array of middleware functions
    this.schemaRegistry = new EventSchemaRegistry(); // Initialize schema registry
    this.schemaRegistry.initialize(process.cwd(), path.join("schemas", "events"));
    
    // Initialize and use the validation middleware
    const invalidEventLogPath = path.join(process.cwd(), "logs", "invalid-events.jsonl");
    const validationMiddleware = createEventValidationMiddleware(this.schemaRegistry, invalidEventLogPath);
    this.use(validationMiddleware);
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  async publish(eventType, payload) {
    let currentPayload = { ...payload }; // Create a mutable copy for middleware
    let stopPropagation = false;

    for (const middlewareFunc of this.middleware) {
      // Middleware can modify currentPayload or stop propagation
      const result = await Promise.resolve(middlewareFunc(eventType, currentPayload, (nextEventType, nextPayload) => {
        currentPayload = nextPayload; // Update payload if middleware modified it
        eventType = nextEventType; // Update eventType if middleware modified it
      }));

      if (result && result.stopPropagation) {
        stopPropagation = true;
        break;
      }
      if (result && result.newPayload) {
        currentPayload = result.newPayload;
      }
    }

    if (stopPropagation) {
      return; // Event was stopped by middleware (e.g., quarantined by validation)
    }

    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(currentPayload));
    }
    const allEventHandlers = this.subscribers.get("*");
    if (allEventHandlers) {
      allEventHandlers.forEach(handler => handler(eventType, currentPayload));
    }
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType).add(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe(eventType, handler) {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  reset() {
    this.subscribers.clear();
    this.middleware = [];
    // Re-initialize schema registry for a clean state in tests
    this.schemaRegistry = new EventSchemaRegistry(); 
    this.schemaRegistry.initialize(process.cwd(), path.join("schemas", "events"));
    const invalidEventLogPath = path.join(process.cwd(), "logs", "invalid-events.jsonl");
    const validationMiddleware = createEventValidationMiddleware(this.schemaRegistry, invalidEventLogPath);
    this.use(validationMiddleware);
  }
}

module.exports = new EventBus();
