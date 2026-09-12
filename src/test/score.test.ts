import { scoreJob } from "../scoring/scorer";
import { DEFAULT_WEIGHTS } from "../config";
import type { Candidate, Job } from "../types";

describe("scoreJob", () => {
  it("should return null when a must-have skill is missing", () => {
    const candidate: Candidate = {
      id: "c1",
      name: "Anju",
      skills: ["Node.js", "PostgreSQL"],
      yearsOfExperience: 2,
      location: "Gurugram",
      expectedSalary: 800000,
    };

    const job: Job = {
      id: "j1",
      title: "Backend Engineer",
      requiredSkills: [
        { name: "Node.js", type: "must" },
        { name: "Go", type: "must" },
      ],
      minYearsExperience: 1,
      location: "Gurugram",
      salaryRange: {
        min: 700000,
        max: 1000000,
      },
      remoteAllowed: false,
    };

    const result = scoreJob(candidate, job, DEFAULT_WEIGHTS);

    expect(result).toBeNull();
  });
});
