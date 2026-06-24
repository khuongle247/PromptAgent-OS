const fs = require("fs");
const path = require("path");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getArtifactRoot(projectDir) {
  return path.join(projectDir, "artifacts");
}

function getManifestPath(projectDir) {
  return path.join(getArtifactRoot(projectDir), "manifest.json");
}

function loadManifest(projectDir) {
  const manifestPath = getManifestPath(projectDir);

  if (!fileExists(manifestPath)) {
    return {
      schemaVersion: "1.0.0",
      artifacts: []
    };
  }

  try {
    return readJson(manifestPath);
  } catch (error) {
    return {
      schemaVersion: "1.0.0",
      artifacts: []
    };
  }
}

function saveManifest(projectDir, manifest) {
  ensureDirectory(getArtifactRoot(projectDir));
  writeJson(getManifestPath(projectDir), manifest);
}

function inferTaskId(artifact, options = {}) {
  return (
    options.taskId ||
    artifact.taskId ||
    artifact?.metadata?.taskId ||
    artifact?.metadata?.currentTaskId ||
    artifact?.task?.id ||
    options.defaultTaskId ||
    "TASK-000"
  );
}

function inferRole(artifact, options = {}) {
  return (
    options.role ||
    artifact.role ||
    artifact?.metadata?.role ||
    artifact?.metadata?.source ||
    "planner"
  );
}

function getArtifactDir(projectDir, role) {
  return path.join(getArtifactRoot(projectDir), role);
}

function getArtifactPath(projectDir, role, taskId) {
  return path.join(getArtifactDir(projectDir, role), `${taskId}.json`);
}

function normalizeArtifactPayload(artifact) {
  if (artifact && typeof artifact === "object" && artifact.output) {
    return artifact.output;
  }

  if (artifact && typeof artifact === "object" && artifact.data) {
    return artifact.data;
  }

  return artifact;
}

function writeArtifact(projectDir, artifact, options = {}) {
  const payload = normalizeArtifactPayload(artifact);
  const role = inferRole(artifact, options);
  const taskId = inferTaskId(artifact, options);
  const artifactDir = getArtifactDir(projectDir, role);
  const artifactPath = getArtifactPath(projectDir, role, taskId);
  const now = new Date().toISOString();

  ensureDirectory(artifactDir);
  writeJson(artifactPath, payload);

  const manifest = loadManifest(projectDir);
  const existingIndex = manifest.artifacts.findIndex(entry => entry.role === role && entry.taskId === taskId);

  const record = {
    id: `${role}:${taskId}`,
    role,
    taskId,
    path: path.relative(projectDir, artifactPath),
    source: options.source || artifact.source || payload?.metadata?.source || "system",
    schemaPath: options.schemaPath || artifact.schemaPath || null,
    createdAt: existingIndex >= 0 ? manifest.artifacts[existingIndex].createdAt : now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    manifest.artifacts[existingIndex] = record;
  } else {
    manifest.artifacts.push(record);
  }

  saveManifest(projectDir, manifest);

  return {
    ...record,
    absolutePath: artifactPath
  };
}

function readArtifact(projectDir, selector) {
  const manifest = loadManifest(projectDir);
  const query = typeof selector === "string" ? { taskId: selector } : (selector || {});

  let record = null;

  if (query.role && query.taskId) {
    record = manifest.artifacts.find(entry => entry.role === query.role && entry.taskId === query.taskId) || null;
  } else if (query.role) {
    const scoped = manifest.artifacts.filter(entry => entry.role === query.role);
    record = scoped[scoped.length - 1] || null;
  } else if (query.taskId) {
    const scoped = manifest.artifacts.filter(entry => entry.taskId === query.taskId);
    record = scoped[scoped.length - 1] || null;
  } else {
    record = manifest.artifacts[manifest.artifacts.length - 1] || null;
  }

  if (!record) {
    return null;
  }

  const artifactPath = path.join(projectDir, record.path);
  if (!fileExists(artifactPath)) {
    return {
      ...record,
      output: null,
      missing: true
    };
  }

  return {
    ...record,
    output: readJson(artifactPath)
  };
}

function listArtifacts(projectDir, selector = {}) {
  const manifest = loadManifest(projectDir);
  return manifest.artifacts
    .filter(entry => {
      if (selector.role && entry.role !== selector.role) {
        return false;
      }

      if (selector.taskId && entry.taskId !== selector.taskId) {
        return false;
      }

      return true;
    })
    .slice()
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

module.exports = {
  getArtifactRoot,
  getManifestPath,
  loadManifest,
  saveManifest,
  writeArtifact,
  readArtifact,
  listArtifacts
};