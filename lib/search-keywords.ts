import type { CandidateTechStack } from "./types";

const FRONTEND = ["react", "next.js", "nextjs", "vue", "angular", "svelte"];
const BACKEND = ["node.js", "nodejs", "nestjs", "express", "fastapi", "django", "spring"];

function normalizeTech(tech: string): string {
  return tech.toLowerCase().trim();
}

export function buildSearchKeywords(input: {
  techStack: CandidateTechStack;
  baseKeyword?: string;
}): string[] {
  const { techStack, baseKeyword } = input;
  const primary = techStack.primary.map(normalizeTech);
  const seniority = techStack.seniority;
  const results: string[] = [];

  if (baseKeyword) results.push(baseKeyword);

  const hasFrontend = primary.some((t) => FRONTEND.includes(t));
  const hasBackend = primary.some((t) => BACKEND.includes(t));

  let roleKeyword: string;
  if (hasFrontend && hasBackend) {
    roleKeyword = "Fullstack JavaScript Developer";
  } else if (hasFrontend) {
    const frontendTechs = techStack.primary.filter((t) =>
      FRONTEND.includes(normalizeTech(t))
    );
    roleKeyword = "Frontend Engineer " + frontendTechs.slice(0, 2).join(" ");
  } else if (hasBackend) {
    const backendTechs = techStack.primary.filter((t) =>
      BACKEND.includes(normalizeTech(t))
    );
    roleKeyword = "Backend Engineer " + backendTechs[0];
  } else if (primary.some((t) => t.includes("python"))) {
    roleKeyword = "Python Developer";
  } else if (primary.length > 0) {
    roleKeyword = techStack.primary[0] + " Developer";
  } else {
    roleKeyword = "Developer";
  }

  if (seniority && seniority !== "intern" && seniority !== "junior") {
    const seniorityPrefix = seniority.charAt(0).toUpperCase() + seniority.slice(1);
    results.push(seniorityPrefix + " " + roleKeyword);
  } else {
    results.push(roleKeyword);
  }

  if (techStack.primary.length >= 2) {
    results.push(techStack.primary.slice(0, 2).join(" ") + " Developer");
  }

  const unique = [...new Set(results.map((k) => k.trim()))].filter(Boolean);
  return unique.slice(0, 5);
}
