/**
 * Content Quality Validator
 * Framework-level validator that detects placeholder text, calculates section completion,
 * and scores documentation quality. Works for any project type.
 */
const fs = require("fs");
const path = require("path");

const PLACEHOLDER_PATTERNS = [
  /^Description:\s*$/im,
  /^Feature \d+$/im,
  /^## Section$/im,
  /^\[\s*\]|^-\s*$/im,
  /^TBD/i,
  /^TODO/i,
  /^[A-Za-z]+:\s*$/im,
  /^### Feature \d+$/im
];

const REQUIRED_SECTIONS = {
  "requirements.md": [
    "Product Name",
    "Problem Statement",
    "Target Users",
    "Goals",
    "Non Goals",
    "Success Metrics",
    "Constraints"
  ],
  "features.md": ["Core Features"],
  "architecture.md": ["Architecture Style", "Layers", "Folder Structure"],
  "tech-stack.md": ["Frontend", "Backend", "Database"]
};

function hasPlaceholderContent(content) {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) return true;
  }
  return false;
}

function calculateSectionCompletion(content, requiredSections) {
  let found = 0;
  for (const section of requiredSections) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`#{1,3}\\s+${escaped}`, "mi");
    const sectionMatch = content.match(regex);
    if (sectionMatch) {
      const afterHeader = content.slice(sectionMatch.index + sectionMatch[0].length).trim();
      const nextHeader = afterHeader.match(/\n#{1,3}\s+/);
      const sectionContent = nextHeader
        ? afterHeader.slice(0, nextHeader.index).trim()
        : afterHeader;
      if (sectionContent.length > 20) found++;
    }
  }
  return requiredSections.length > 0 ? Math.round((found / requiredSections.length) * 100) : 0;
}

function validateContent(projectDir, report) {
  const docsDir = path.join(projectDir, "docs");
  if (!fs.existsSync(docsDir)) return;

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    if (hasPlaceholderContent(content)) {
      report.warnings.push(`${file}: Contains placeholder text`);
      report.score -= 2;
    }

    if (REQUIRED_SECTIONS[file]) {
      const completion = calculateSectionCompletion(content, REQUIRED_SECTIONS[file]);
      if (completion < 50) {
        report.warnings.push(`${file}: Section completion is ${completion}% (requires 50%+)`);
        report.score -= 3;
      }
    }

    if (content.trim().length < 50) {
      report.warnings.push(`${file}: Content is too short (${content.trim().length} chars)`);
      report.score -= 2;
    }
  }
}

module.exports = { validateContent, hasPlaceholderContent, calculateSectionCompletion };
