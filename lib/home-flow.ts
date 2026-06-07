type TechStackForm = {
  primary: string;
  secondary: string;
  learning: string;
  avoid: string;
  seniority: "intern" | "junior" | "middle" | "senior" | "lead" | "";
};

type ExpectationsForm = {
  preferredWorkModes: Array<"remote" | "hybrid" | "onsite">;
  minimumSalary: string;
  requiredBenefits: string;
  niceToHaveBenefits: string;
  locations: string;
  note: string;
};

type PresetPayloadInput = {
  name: string;
  siteUrl: string;
  keyword: string;
  location: string;
  techStack: TechStackForm;
  expectations: ExpectationsForm;
};

export function buildPresetPayload(input: PresetPayloadInput) {
  return {
    name: input.name,
    siteUrl: input.siteUrl,
    keyword: input.keyword,
    location: input.location || undefined,
    techStack: input.techStack,
    expectations: input.expectations,
  };
}

export function getPostAnalyzeStep(input: {
  newJobsCount: number;
  existingCount: number;
}): 1 | 3 {
  return input.newJobsCount > 0 || input.existingCount > 0 ? 3 : 1;
}
