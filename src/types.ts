export interface Candidate {
  id: string;
  name: string;
  skills: string[];
  yearsOfExperience: number;
  location: string;
  expectedSalary: number;
}

export interface RequiredSkill {
  name: string;
  type: "must" | "nice";
}

export interface SalaryRange {
  min: number;
  max: number;
}

export interface Job {
  id: string;
  title: string;
  requiredSkills: RequiredSkill[];
  minYearsExperience: number;
  location: string;
  salaryRange: SalaryRange;
  remoteAllowed: boolean;
}

export interface Weights {
  skills: number;
  experience: number;
  location: number;
  salary: number;
}

export interface Breakdown {
  skills: number;
  experience: number;
  location: number;
  salary: number;
}
