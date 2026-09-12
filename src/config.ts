import type { Weights } from "./types";

const DEFAULT_WEIGHTS: Weights = {
  skills: 50,
  experience: 20,
  location: 15,
  salary: 15,
};

export function normalizeWeights(weights: Weights): Weights {
  const total =
    weights.skills + weights.experience + weights.location + weights.salary;

  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }

  return {
    skills: (weights.skills / total) * 100,
    experience: (weights.experience / total) * 100,
    location: (weights.location / total) * 100,
    salary: (weights.salary / total) * 100,
  };
}

export { DEFAULT_WEIGHTS };
