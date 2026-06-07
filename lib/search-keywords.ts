import type { CandidateTechStack } from "./types";

const FRONTEND = ["react", "next.js", "nextjs", "vue", "angular", "svelte"];
const BACKEND = ["node.js", "nodejs", "nestjs", "express", "fastapi", "django", "spring"];

function normalizeTech(tech: string): string {
  return tech.toLowerCase().trim();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pushKeyword(results: string[], value: string) {
  const keyword = value.replace(/\s+/g, " ").trim();
  if (!keyword) return;
  if (!results.some((existing) => existing.toLowerCase() === keyword.toLowerCase())) {
    results.push(keyword);
  }
}

export function buildSearchKeywords(input: {
  techStack: CandidateTechStack;
  baseKeyword?: string;
}): string[] {
  const { techStack, baseKeyword } = input;
  const primary = techStack.primary.map(normalizeTech);
  const seniorityLabel = techStack.seniority ? titleCase(techStack.seniority) : "";
  const results: string[] = [];

  if (baseKeyword) pushKeyword(results, baseKeyword);

  const hasFrontend = primary.some((t) => FRONTEND.includes(t));
  const hasBackend = primary.some((t) => BACKEND.includes(t));
  const frontendTechs = techStack.primary.filter((t) =>
    FRONTEND.includes(normalizeTech(t))
  );
  const backendTechs = techStack.primary.filter((t) =>
    BACKEND.includes(normalizeTech(t))
  );
  const primaryTechs = techStack.primary.slice(0, 4).join(" ");

  if (hasFrontend && hasBackend) {
    pushKeyword(
      results,
      [seniorityLabel, "Fullstack JavaScript", primaryTechs].filter(Boolean).join(" "),
    );
    pushKeyword(
      results,
      [seniorityLabel, "Fullstack Engineer", frontendTechs[0], backendTechs[0]]
        .filter(Boolean)
        .join(" "),
    );
  } else if (hasFrontend) {
    pushKeyword(
      results,
      [seniorityLabel, "Frontend", frontendTechs.slice(0, 3).join(" ")]
        .filter(Boolean)
        .join(" "),
    );
    pushKeyword(
      results,
      [seniorityLabel, "Frontend Engineer", frontendTechs.slice(0, 2).join(" ")]
        .filter(Boolean)
        .join(" "),
    );
  } else if (hasBackend) {
    pushKeyword(
      results,
      [seniorityLabel, "Backend", backendTechs.slice(0, 3).join(" ")]
        .filter(Boolean)
        .join(" "),
    );
    pushKeyword(
      results,
      [seniorityLabel, "Backend Engineer", backendTechs.slice(0, 2).join(" ")]
        .filter(Boolean)
        .join(" "),
    );
  } else if (primary.length > 0) {
    pushKeyword(
      results,
      [seniorityLabel, "Software Engineer", primaryTechs].filter(Boolean).join(" "),
    );
  } else {
    pushKeyword(results, [seniorityLabel, "Software Engineer"].filter(Boolean).join(" "));
  }

  pushKeyword(results, primaryTechs);

  if (techStack.primary.length >= 2) {
    pushKeyword(
      results,
      [seniorityLabel, techStack.primary.slice(0, 2).join(" "), "Engineer"]
        .filter(Boolean)
        .join(" "),
    );
  }

  return results.slice(0, 5);
}
