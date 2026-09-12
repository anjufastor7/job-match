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
  it("should give a higher skill score when nice-to-have skills match", () => {
    const candidate: Candidate = {
      id: "c1",
      name: "Anju",
      skills: ["Node.js", "PostgreSQL", "Redis"],
      yearsOfExperience: 2,
      location: "Gurugram",
      expectedSalary: 800000,
    };

    const job: Job = {
      id: "j1",
      title: "Backend Engineer",
      requiredSkills: [
        { name: "Node.js", type: "must" },
        { name: "PostgreSQL", type: "must" },
        { name: "Redis", type: "nice" },
        { name: "Kafka", type: "nice" },
      ],
      minYearsExperience: 2,
      location: "Gurugram",
      salaryRange: {
        min: 700000,
        max: 1000000,
      },
      remoteAllowed: false,
    };

    const result = scoreJob(candidate, job, DEFAULT_WEIGHTS);

    expect(result).not.toBeNull();
    expect(result!.breakdown.skills).toBe(37.5);
  });
  it("should give full skill points when the job has no required skills", () => {
    const candidate: Candidate = {
      id: "c1",
      name: "Anju",
      skills: ["Node.js"],
      yearsOfExperience: 2,
      location: "Gurugram",
      expectedSalary: 800000,
    };

    const job: Job = {
      id: "j1",
      title: "Backend Engineer",
      requiredSkills: [],
      minYearsExperience: 2,
      location: "Gurugram",
      salaryRange: {
        min: 700000,
        max: 1000000,
      },
      remoteAllowed: false,
    };

    const result = scoreJob(candidate, job, DEFAULT_WEIGHTS);

    expect(result).not.toBeNull();
    expect(result!.breakdown.skills).toBe(50);
  });
  it("should penalize a candidate below the required experience", () => {
    const candidate: Candidate = {
      id: "c1",
      name: "Anju",
      skills: ["Node.js"],
      yearsOfExperience: 2,
      location: "Gurugram",
      expectedSalary: 800000,
    };

    const job: Job = {
      id: "j1",
      title: "Backend Engineer",
      requiredSkills: [{ name: "Node.js", type: "must" }],
      minYearsExperience: 4,
      location: "Gurugram",
      salaryRange: {
        min: 700000,
        max: 1000000,
      },
      remoteAllowed: false,
    };

    const result = scoreJob(candidate, job, DEFAULT_WEIGHTS);

    expect(result).not.toBeNull();
    expect(result!.breakdown.experience).toBe(10);
  });
  it("should give full experience points when minimum experience is zero", () => {
    const candidate: Candidate = {
      id: "c1",
      name: "Anju",
      skills: ["Node.js"],
      yearsOfExperience: 0,
      location: "Gurugram",
      expectedSalary: 800000,
    };

    const job: Job = {
      id: "j1",
      title: "Backend Engineer",
      requiredSkills: [{ name: "Node.js", type: "must" }],
      minYearsExperience: 0,
      location: "Gurugram",
      salaryRange: {
        min: 700000,
        max: 1000000,
      },
      remoteAllowed: false,
    };

    const result = scoreJob(candidate, job, DEFAULT_WEIGHTS);

    expect(result).not.toBeNull();
    expect(result!.breakdown.experience).toBe(20);
  });
});
