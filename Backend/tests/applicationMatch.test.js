const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateApplicationMatch,
  calculateCvMatch,
} = require("../services/applicationMatch.service");

test("application match scores required skills and experience", () => {
  const result = calculateApplicationMatch(
    {
      requiredSkills: ["Node.js", "MongoDB"],
      preferredSkills: ["Docker"],
      experienceYears: 2,
    },
    {
      skills: ["Node.js", "MongoDB", "Docker"],
      experience: 2,
    }
  );

  assert.equal(result.score, 100);
  assert.equal(result.missingSkills.length, 0);
});

test("CV text can feed the match pipeline directly", () => {
  const result = calculateCvMatch(
    {
      requiredSkills: ["JavaScript", "MongoDB"],
      preferredSkills: [],
      experienceYears: 1,
    },
    "Javanshir Hashimov\nRole: Backend Developer\nSkills\nJavaScript\nMongoDB\n2 years experience"
  );

  assert.equal(result.match.score, 100);
  assert.ok(result.parsedCandidate.skills.includes("JavaScript"));
});
