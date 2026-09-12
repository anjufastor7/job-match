import type { Candidate, Job, Weights, Breakdown } from "../types";

export function scoreJob(
  candidate: Candidate,
  job: Job,
  weights: Weights,
): { score: number; breakdown: Breakdown } | null {
  const candidateSkills = new Set(
    candidate.skills.map((skill) => skill.trim().toLowerCase()),
  );
  const mustHaveSkills = job.requiredSkills.filter(
    (skill) => skill.type === "must",
  );

  const hasAllMustHaveSkills = mustHaveSkills.every((skill) =>
    candidateSkills.has(skill.name.trim().toLowerCase()),
  );
  if (!hasAllMustHaveSkills) {
    return null;
  }
  const totalRequiredSkills = job.requiredSkills.length;

  const matchedSkills = job.requiredSkills.filter((skill) =>
    candidateSkills.has(skill.name.trim().toLowerCase()),
  ).length;

  let skillsScore: number;

  if (totalRequiredSkills === 0) {
    skillsScore = weights.skills;
  } else {
    skillsScore = weights.skills * (matchedSkills / totalRequiredSkills);
  }
  let experienceScore: number;

  if (job.minYearsExperience === 0) {
    experienceScore = weights.experience;
  } else if (candidate.yearsOfExperience >= job.minYearsExperience) {
    experienceScore = weights.experience;
  } else {
    experienceScore =
      weights.experience *
      (candidate.yearsOfExperience / job.minYearsExperience);
  }

  let locationScore: number;

  const candidateLocation = candidate.location.trim().toLowerCase();
  const jobLocation = job.location.trim().toLowerCase();

  if (candidateLocation === jobLocation) {
    locationScore = weights.location;
  } else if (job.remoteAllowed) {
    locationScore = weights.location * (10 / 15);
  } else {
    locationScore = 0;
  }

  let salaryScore: number;

  const expectedSalary = candidate.expectedSalary;
  const minSalary = job.salaryRange.min;
  const maxSalary = job.salaryRange.max;

  if (expectedSalary > maxSalary) {
    salaryScore = 0;
  } else if (minSalary >= expectedSalary) {
    salaryScore = weights.salary;
  } else {
    salaryScore =
      weights.salary *
      (0.5 + 0.5 * ((maxSalary - expectedSalary) / (maxSalary - minSalary)));
  }

  const breakdown: Breakdown = {
    skills: skillsScore,
    experience: experienceScore,
    location: locationScore,
    salary: salaryScore,
  };

  const score = skillsScore + experienceScore + locationScore + salaryScore;

  return {
    score: Math.round(score * 100) / 100,
    breakdown,
  };
}
