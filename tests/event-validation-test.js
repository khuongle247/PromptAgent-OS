const EventBus = require("../workflow/event-bus");
const fs = require("fs");
const path = require("path");

const INVALID_EVENTS_LOG = path.join(process.cwd(), "logs", "invalid-events.jsonl");

// Utility to clear log file before tests
function clearInvalidEventsLog() {
  if (fs.existsSync(INVALID_EVENTS_LOG)) {
    fs.unlinkSync(INVALID_EVENTS_LOG);
  }
}

// --- Test Case A: Valid AgentExecuted event ---
async function testValidAgentExecutedEvent() {
  console.log("\n--- Running Test Case A: Valid AgentExecuted event ---");
  clearInvalidEventsLog();
  EventBus.reset(); // Reset EventBus for clean test state

  let eventReceived = false;
  const handler = (payload) => {
    eventReceived = true;
    console.log("Subscriber received valid event:", payload);
  };

  EventBus.subscribe("agent-executed", handler);

  const validEvent = {
    agent: "planner",
    taskId: "TASK-001",
    ok: true,
    output: { message: "Planner output" },
    validation: { valid: true, errors: [] },
    duration: 100,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    context: { projectId: "test-project" }
  };

  await EventBus.publish("agent-executed", validEvent);

  if (eventReceived && !fs.existsSync(INVALID_EVENTS_LOG)) {
    console.log("Test A PASSED: Valid event reached subscriber and not logged as invalid.");
  } else {
    console.error("Test A FAILED: Valid event did not behave as expected.");
    if (!eventReceived) console.error("  - Event was NOT received by subscriber.");
    if (fs.existsSync(INVALID_EVENTS_LOG)) console.error("  - Invalid events log was created/had content.");
  }
}

// --- Test Case B: Invalid AgentExecuted event ---
async function testInvalidAgentExecutedEvent() {
  console.log("\n--- Running Test Case B: Invalid AgentExecuted event ---");
  clearInvalidEventsLog();
  EventBus.reset(); // Reset EventBus for clean test state

  let eventReceived = false;
  const handler = (payload) => {
    eventReceived = true;
    console.log("Subscriber unexpectedly received invalid event:", payload);
  };

  EventBus.subscribe("agent-executed", handler);

  const invalidEvent = {
    agent: "planner",
    taskId: "INVALID_TASK_ID", // Invalid pattern
    ok: true,
    output: { message: "Planner output" },
    validation: { valid: true, errors: [] },
    duration: 100,
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0",
    context: { projectId: "test-project" }
  };

  await EventBus.publish("agent-executed", invalidEvent);

  if (!eventReceived && fs.existsSync(INVALID_EVENTS_LOG)) {
    const logContent = fs.readFileSync(INVALID_EVENTS_LOG, "utf8");
    if (logContent.includes("INVALID_TASK_ID")) {
      console.log("Test B PASSED: Invalid event quarantined and logged correctly.");
    } else {
      console.error("Test B FAILED: Invalid event logged but content mismatch.");
    }
  } else {
    console.error("Test B FAILED: Invalid event did not behave as expected.");
    if (eventReceived) console.error("  - Event was unexpectedly received by subscriber.");
    if (!fs.existsSync(INVALID_EVENTS_LOG)) console.error("  - Invalid events log was NOT created.");
  }
}

// --- Run all tests ---
async function runAllTests() {
  await testValidAgentExecutedEvent();
  await testInvalidAgentExecutedEvent();
  console.log("\n--- Event Validation Tests Complete ---");
}

runAllTests();
