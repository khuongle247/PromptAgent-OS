/**
 * prompt-version-manager.js
 * Phase 9: Prompt Self-Improving System — Version Manager.
 * Manages prompt versions per agent role with metadata tracking.
 *
 * Directory structure:
 *   prompts/{role}/
 *     v1.md        (current active)
 *     v2.md        (candidate or previous)
 *     v3.md        (candidate or previous)
 *     versions.json (metadata index)
 *
 * API:
 *   getActiveVersion(role)           → { version, content, metadata }
 *   getVersion(role, version)        → { content, metadata }
 *   listVersions(role)               → [metadata]
 *   createCandidate(role, content, parentVersion) → metadata
 *   promoteVersion(role, version)    → metadata (promotes candidate to active)
 *   getAllActiveVersions()           → { planner: v, architect: v, ... }
 *
 * Constraints:
 *   - Additive only.
 *   - Existing prompts remain compatible.
 *   - Manual review is possible via file access.
 */

const fs = require("fs");
const path = require("path");

const PROMPTS_DIR = path.join(process.cwd(), "prompts");
const AGENT_ROLES = ["planner", "architect", "coder", "reviewer", "debugger"];

// ---- Path Helpers ----

function getRoleDir(role) {
  const dir = path.join(PROMPTS_DIR, role);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getVersionFilePath(role, version) {
  return path.join(getRoleDir(role), `v${version}.md`);
}

function getVersionsJsonPath(role) {
  return path.join(getRoleDir(role), "versions.json");
}

// ---- Metadata Operations ----

function loadVersions(role) {
  const metaPath = getVersionsJsonPath(role);
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (err) {
      return { versions: [], activeVersion: 1 };
    }
  }
  return { versions: [], activeVersion: 1 };
}

function saveVersions(role, data) {
  const metaPath = getVersionsJsonPath(role);
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

function findMetadata(versions, ver) {
  return versions.versions.find(v => v.version === ver) || null;
}

// ---- Bootstrap: Seed v1 from existing prompt ----

function bootstrapVersion(role) {
  const legacyPath = path.join(PROMPTS_DIR, `${role}.md`);
  const v1Path = getVersionFilePath(role, 1);

  if (!fs.existsSync(v1Path) && fs.existsSync(legacyPath)) {
    const content = fs.readFileSync(legacyPath, "utf8");
    fs.writeFileSync(v1Path, content);
  }

  // Ensure versions.json exists
  const meta = loadVersions(role);
  if (meta.versions.length === 0) {
    const v1Content = fs.existsSync(v1Path) ? fs.readFileSync(v1Path, "utf8") : "";
    meta.versions.push({
      version: 1,
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Assume v1 existed yesterday
      parentVersion: null,
      successRate: 0,
      approvalStatus: "active",
      isActive: true,
      note: "Initial prompt version."
    });
    meta.activeVersion = 1;
    saveVersions(role, meta);
  }
}

// ---- Public API ----

function getActiveVersion(role) {
  if (!AGENT_ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  bootstrapVersion(role);

  const meta = loadVersions(role);
  const activeVer = meta.activeVersion || 1;
  const contentPath = getVersionFilePath(role, activeVer);

  if (!fs.existsSync(contentPath)) {
    // Fall back to legacy prompt
    const legacyPath = path.join(PROMPTS_DIR, `${role}.md`);
    if (fs.existsSync(legacyPath)) {
      return {
        version: activeVer,
        content: fs.readFileSync(legacyPath, "utf8"),
        metadata: findMetadata(meta, activeVer) || { version: activeVer }
      };
    }
    return { version: activeVer, content: "", metadata: {} };
  }

  return {
    version: activeVer,
    content: fs.readFileSync(contentPath, "utf8"),
    metadata: findMetadata(meta, activeVer) || { version: activeVer }
  };
}

function getVersion(role, version) {
  if (!AGENT_ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  bootstrapVersion(role);

  const meta = loadVersions(role);
  const contentPath = getVersionFilePath(role, version);

  if (!fs.existsSync(contentPath)) return null;

  return {
    version,
    content: fs.readFileSync(contentPath, "utf8"),
    metadata: findMetadata(meta, version) || { version }
  };
}

function listVersions(role) {
  if (!AGENT_ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  bootstrapVersion(role);

  const meta = loadVersions(role);
  return meta.versions.map(v => ({
    ...v,
    isActive: v.version === meta.activeVersion
  }));
}

function createCandidate(role, content, parentVersion = null) {
  if (!AGENT_ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  bootstrapVersion(role);

  const meta = loadVersions(role);
  const nextVersion =
    meta.versions.length > 0 ? Math.max(...meta.versions.map(v => v.version)) + 1 : 2;

  // Write the prompt file
  const filePath = getVersionFilePath(role, nextVersion);
  fs.writeFileSync(filePath, content);

  // Record metadata
  const entry = {
    version: nextVersion,
    createdAt: new Date().toISOString(),
    parentVersion: parentVersion || meta.activeVersion,
    successRate: 0,
    approvalStatus: "candidate",
    isActive: false,
    note: `Candidate v${nextVersion} derived from v${parentVersion || meta.activeVersion}.`
  };

  meta.versions.push(entry);
  saveVersions(role, meta);

  return entry;
}

function promoteVersion(role, version) {
  if (!AGENT_ROLES.includes(role)) throw new Error(`Unknown role: ${role}`);
  bootstrapVersion(role);

  const meta = loadVersions(role);
  const target = findMetadata(meta, version);

  if (!target) throw new Error(`Version v${version} not found for role ${role}`);

  // Deactivate current active
  meta.versions.forEach(v => {
    if (v.version === meta.activeVersion) {
      v.isActive = false;
      v.approvalStatus = "superseded";
    }
  });

  // Activate new version
  target.isActive = true;
  target.approvalStatus = "active";
  meta.activeVersion = version;

  saveVersions(role, meta);

  return target;
}

function getAllActiveVersions() {
  const result = {};
  AGENT_ROLES.forEach(role => {
    try {
      const active = getActiveVersion(role);
      result[role] = {
        version: active.version,
        note: active.metadata?.note || "",
        createdAt: active.metadata?.createdAt || ""
      };
    } catch (err) {
      result[role] = { version: 1, error: err.message };
    }
  });
  return result;
}

function updateVersionMetadata(role, version, updates) {
  const meta = loadVersions(role);
  const target = findMetadata(meta, version);
  if (!target) throw new Error(`Version v${version} not found for role ${role}`);

  Object.assign(target, updates);
  saveVersions(role, meta);
  return target;
}

// Bootstrap all roles on load
AGENT_ROLES.forEach(role => {
  try {
    bootstrapVersion(role);
  } catch (e) {
    /* ignore */
  }
});

module.exports = {
  AGENT_ROLES,
  getActiveVersion,
  getVersion,
  listVersions,
  createCandidate,
  promoteVersion,
  getAllActiveVersions,
  updateVersionMetadata,
  bootstrapVersion
};
