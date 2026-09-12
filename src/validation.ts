import { z } from "zod";

export const candidateSchema = z.object({
  name: z.string().trim().min(1),
  skills: z.array(z.string().trim().min(1)),
  yearsOfExperience: z.number().min(0),
  location: z.string().trim().min(1),
  expectedSalary: z.number().min(0),
});

const requiredSkillSchema = z.object({
  name: z.string().trim().min(1),
  type: z.enum(["must", "nice"]),
});

const salaryRangeSchema = z
  .object({
    min: z.number().min(0),
    max: z.number().min(0),
  })
  .refine((salary) => salary.max >= salary.min, {
    message: "Salary max must be greater than or equal to salary min",
  });

export const jobSchema = z.object({
  title: z.string().trim().min(1),
  requiredSkills: z.array(requiredSkillSchema),
  minYearsExperience: z.number().min(0),
  location: z.string().trim().min(1),
  salaryRange: salaryRangeSchema,
  remoteAllowed: z.boolean(),
});

export const weightSchema = z.object({
  wSkills: z.coerce.number().positive().optional(),
  wExperience: z.coerce.number().positive().optional(),
  wLocation: z.coerce.number().positive().optional(),
  wSalary: z.coerce.number().positive().optional(),
});
