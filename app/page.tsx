"use client";

import { useEffect, useMemo, useState } from "react";
import { getProfileSetupState } from "@/lib/profile-setup";
import { SUPPORTED_SITES } from "@/crawlers/sites";
import { buildSearchKeywords } from "@/lib/search-keywords";
import type { CandidateTechStack } from "@/lib/types";
import { buildPresetPayload, getPostAnalyzeStep } from "@/lib/home-flow";

type MiningRun = {
  id: number;
  keywords: string;
  site: string;
  location: string | null;
  found: number;
  scored: number;
  errors: string | null;
  createdAt: string;
};

const ANALYSIS_MIN_SCORE = 70;

type Job = {
  id: number;
  site: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string | null;
  score: number | null;
  fitLevel: string | null;
  reason: string | null;
  matchedSkills: string | null;
  missingSkills: string | null;
  redFlags: string | null;
  salary: string | null;
  workMode: string | null;
  detectedTechStack: string | null;
  expectationMatches: string | null;
  status: string;
  createdAt?: string;
};

type SearchPreset = {
  id: number;
  name: string;
  siteUrl: string | null;
  keyword: string | null;
  location: string | null;
  techStack: string | null;
  expectations: string | null;
  createdAt: string;
};

type JobStatus =
  | "new"
  | "shortlisted"
  | "applied"
  | "rejected"
  | "interviewing"
  | "offer";

type CandidateProfile = {
  id: number;
  summary: string;
  sourceName: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Step = 1 | 2 | 3;

const STEPS = ["Configure", "Analyze", "Results"];

function Stepper({ current }: { current: Step }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-5 py-4">
      <div className="flex items-center">
        {STEPS.map((label, i) => {
          const num = (i + 1) as Step;
          const isDone = num < current;
          const isActive = num === current;
          return (
            <div
              key={label}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    isDone || isActive
                      ? "text-white"
                      : "bg-stone-100 border-2 border-stone-200 text-stone-400",
                    isActive ? "ring-4 ring-orange-200" : "",
                  ].join(" ")}
                  style={
                    isDone || isActive
                      ? {
                          background: "linear-gradient(135deg,#f97316,#ec4899)",
                        }
                      : undefined
                  }
                >
                  {isDone ? "✓" : num}
                </div>
                <div
                  className={[
                    "text-[9px] font-semibold uppercase tracking-wide mt-1",
                    isDone || isActive ? "text-orange-500" : "text-stone-400",
                  ].join(" ")}
                >
                  {label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1 mb-4"
                  style={
                    isDone
                      ? { background: "linear-gradient(90deg,#f97316,#ec4899)" }
                      : { background: "#e7e5e4" }
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span
        className="shrink-0 text-sm font-extrabold px-2.5 py-1 rounded-lg text-white"
        style={{
          background: "linear-gradient(135deg,#f97316,#ec4899)",
          boxShadow: "0 2px 6px rgba(249,115,22,.3)",
        }}
      >
        {score}
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="shrink-0 text-sm font-extrabold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-500 border border-orange-200">
        {score}
      </span>
    );
  }
  return (
    <span className="shrink-0 text-sm font-extrabold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 border border-red-200">
      {score}
    </span>
  );
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "shortlisted":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "applied":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "interviewing":
      return "bg-purple-50 text-purple-700 border border-purple-200";
    case "offer":
      return "bg-green-50 text-green-700 border border-green-200";
    case "rejected":
      return "bg-stone-100 text-stone-400 border border-stone-200";
    default:
      return "bg-stone-50 text-stone-500 border border-stone-200";
  }
}

function TriStateIcon({
  value,
}: {
  value: boolean | "unknown" | null | undefined;
}) {
  if (value === true)
    return <span className="text-green-600 font-bold">✓</span>;
  if (value === false) return <span className="text-red-500 font-bold">✗</span>;
  return <span className="text-stone-400">?</span>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-stone-400 shrink-0 w-20">{label}</span>
      <span className="text-stone-700">{value}</span>
    </div>
  );
}

const COVER_STYLES = [
  "professional",
  "friendly",
  "short",
  "startup",
  "corporate",
  "vietnamese",
  "bilingual",
] as const;
const MESSAGE_TYPES = [
  { value: "cover_letter", label: "Cover letter" },
  { value: "recruiter_message", label: "Recruiter msg" },
  { value: "linkedin_message", label: "LinkedIn msg" },
  { value: "email_application", label: "Email application" },
  { value: "resume_tips", label: "Resume tips" },
] as const;

function CoverLetterControls({
  coverLetter,
  loading,
  onGenerate,
}: {
  coverLetter?: string;
  loading: boolean;
  onGenerate: (style: string, messageType: string) => void;
}) {
  const [style, setStyle] = useState<string>("professional");
  const [messageType, setMessageType] = useState<string>("cover_letter");

  if (coverLetter) {
    return (
      <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2.5 py-1 opacity-60">
        ✉ Generated ▾
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-stone-50 text-stone-700 outline-none focus:border-orange-400"
      >
        {COVER_STYLES.map((s) => (
          <option key={s} value={s} className="capitalize">
            {s}
          </option>
        ))}
      </select>
      <select
        value={messageType}
        onChange={(e) => setMessageType(e.target.value)}
        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-stone-50 text-stone-700 outline-none focus:border-orange-400"
      >
        {MESSAGE_TYPES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onGenerate(style, messageType)}
        disabled={loading}
        className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2.5 py-1 hover:bg-orange-100 disabled:opacity-50"
      >
        {loading ? "Generating…" : "✉ Generate"}
      </button>
    </div>
  );
}

function JobCard({
  job,
  coverLetter,
  loading,
  onGenerate,
  isTop,
  compareSelected,
  onToggleCompare,
  onViewDetails,
  onStatusChange,
}: {
  job: Job;
  coverLetter?: string;
  loading: boolean;
  onGenerate: (style: string, messageType: string) => void;
  isTop: boolean;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
  onViewDetails?: () => void;
  onStatusChange?: (status: JobStatus) => void;
}) {
  return (
    <div
      className={[
        "border rounded-xl p-4 space-y-2 transition-shadow",
        isTop ? "border-orange-200" : "border-stone-200",
        (job.score ?? 100) < 40 ? "opacity-60" : "",
      ].join(" ")}
      style={
        isTop ? { boxShadow: "0 2px 12px rgba(249,115,22,.08)" } : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-stone-900">{job.title}</h3>
          {(job.company || job.location) && (
            <p className="text-xs text-stone-500 mt-0.5">
              {[job.company, job.location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {job.score !== null && <ScoreBadge score={job.score} />}
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            AI JD evaluation
          </p>
          <span className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-[10px] font-bold text-orange-600">
            {job.score === null
              ? "Needs evaluation"
              : job.score >= 70
                ? "Strong expectation match"
                : job.score >= 40
                  ? "Partial expectation match"
                  : "Low expectation match"}
          </span>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          {job.reason ??
            "Score this saved JD to let the core AI API evaluate expectations, profile alignment, gaps, and next action."}
        </p>
        <div className="border-t border-stone-200 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
            JD snapshot
          </p>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            {job.description?.replace(/\s+/g, " ").trim().slice(0, 240) ||
              "No JD description was captured yet."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {job.workMode && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.workMode === "remote" ? "bg-green-50 text-green-700 border border-green-200" : job.workMode === "hybrid" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-stone-100 text-stone-600 border border-stone-200"}`}
          >
            {job.workMode}
          </span>
        )}
        {job.salary && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            {job.salary}
          </span>
        )}
        {job.detectedTechStack &&
          (() => {
            try {
              const techs = JSON.parse(job.detectedTechStack) as string[];
              if (techs.length === 0) return null;
              const shown = techs.slice(0, 5);
              const extra = techs.length - shown.length;
              return (
                <div className="flex flex-wrap gap-1">
                  {shown.map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="text-xs text-stone-400">
                      +{extra} more
                    </span>
                  )}
                </div>
              );
            } catch {
              return null;
            }
          })()}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-500 font-semibold hover:underline"
        >
          View job ↗
        </a>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs text-stone-500 hover:text-stone-700 underline"
          >
            View details
          </button>
        )}
        {onToggleCompare && (
          <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer">
            <input
              type="checkbox"
              checked={compareSelected}
              onChange={onToggleCompare}
              className="accent-orange-500"
            />
            Compare
          </label>
        )}
        <CoverLetterControls
          coverLetter={coverLetter}
          loading={loading}
          onGenerate={onGenerate}
        />
      </div>

      {onStatusChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Status:</span>
          <select
            value={job.status}
            onChange={(e) => onStatusChange(e.target.value as JobStatus)}
            className={`text-xs rounded-md px-2 py-0.5 font-medium outline-none cursor-pointer focus:ring-1 focus:ring-orange-400 ${statusColor(job.status)}`}
          >
            {(
              [
                "new",
                "shortlisted",
                "applied",
                "interviewing",
                "offer",
                "rejected",
              ] as JobStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {coverLetter && (
        <div className="border-t border-orange-100 pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-500">
            ✉ Cover Letter
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
            {coverLetter}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [siteUrl, setSiteUrl] = useState("https://itviec.com");
  const [keyword, setKeyword] = useState("React Node.js Fullstack");
  const [location, setLocation] = useState("Ho Chi Minh City");
  const [limit, setLimit] = useState(12);
  const [profile, setProfile] = useState("");
  const [savedProfile, setSavedProfile] = useState<CandidateProfile | null>(
    null,
  );
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [coverLetters, setCoverLetters] = useState<Record<number, string>>({});
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(false);
  const [loadingCover, setLoadingCover] = useState<Record<number, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [miningRuns, setMiningRuns] = useState<MiningRun[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [presets, setPresets] = useState<SearchPreset[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    async function loadSavedJobs() {
      setLoadingSavedJobs(true);
      try {
        const res = await fetch("/api/jobs");
        const data = await res.json();
        if (res.ok) setSavedJobs(data.jobs);
      } finally {
        setLoadingSavedJobs(false);
      }
    }

    async function loadCandidateProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok && data.profile) {
          setSavedProfile(data.profile);
          setProfile(data.profile.summary);
        }
      } catch {
        // The profile setup stays usable even when this optional load fails.
      }
    }

    async function loadMiningRuns() {
      try {
        const res = await fetch("/api/mining-runs");
        const data = await res.json();
        if (res.ok) setMiningRuns(data.runs);
      } catch {
        // non-fatal
      }
    }

    async function loadPresets() {
      try {
        const res = await fetch("/api/presets");
        const data = await res.json();
        if (res.ok) setPresets(data.presets);
      } catch {
        // non-fatal
      }
    }

    void loadSavedJobs();
    void loadCandidateProfile();
    void loadMiningRuns();
    void loadPresets();
  }, []);

  async function refreshSavedJobs() {
    setLoadingSavedJobs(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load saved jobs");
      setSavedJobs(data.jobs);
    } finally {
      setLoadingSavedJobs(false);
    }
  }

  async function uploadCvProfile() {
    if (!profileFile) {
      setError("Choose a CV file first.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoadingProfile(true);
    try {
      const form = new FormData();
      form.append("cv", profileFile);
      const res = await fetch("/api/profile/cv", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not summarize CV");
      setSavedProfile(data.profile);
      setProfile(data.profile.summary);
      setProfileFile(null);
      setNotice("Saved a new AI profile summary from your CV.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not summarize CV");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function mine() {
    if (!profile.trim()) {
      setError("Upload or enter your profile before analyzing jobs.");
      return;
    }

    setError(null);
    setNotice(null);
    setLoadingMine(true);
    setCurrentStep(2);
    try {
      const parsedTechStack = {
        primary: techStack.primary
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        secondary: techStack.secondary
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        learning: techStack.learning
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        avoid: techStack.avoid
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        seniority: techStack.seniority || undefined,
      };
      const parsedExpectations = {
        preferredWorkModes: expectations.preferredWorkModes,
        minimumSalary: expectations.minimumSalary || undefined,
        requiredBenefits: expectations.requiredBenefits
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        niceToHaveBenefits: expectations.niceToHaveBenefits
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        locations: expectations.locations
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        note: expectations.note || undefined,
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl,
          keyword: keyword || undefined,
          location: location || undefined,
          profile,
          techStack: parsedTechStack,
          expectations: parsedExpectations,
          limit,
          minScore: ANALYSIS_MIN_SCORE,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setJobs(data.jobs);
      setDuplicateCount(data.existingCount ?? 0);
      await refreshSavedJobs();
      if (data.jobs.length > 0) {
        setNotice(
          `Showing ${data.jobs.length} AI matched job${data.jobs.length === 1 ? "" : "s"} ranked by fit.`,
        );
      } else if (data.existingCount > 0) {
        setNotice(
          `No new jobs were analyzed. ${data.existingCount} already matched job${
            data.existingCount === 1 ? "" : "s"
          } remain available in AI matched jobs.`,
        );
      }
      setCurrentStep(
        getPostAnalyzeStep({
          newJobsCount: data.jobs.length,
          existingCount: data.existingCount ?? 0,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setCurrentStep(1);
    } finally {
      setLoadingMine(false);
    }
  }

  const [techStack, setTechStack] = useState<{
    primary: string;
    secondary: string;
    learning: string;
    avoid: string;
    seniority: "intern" | "junior" | "middle" | "senior" | "lead" | "";
  }>({
    primary: "React, Next.js, TypeScript, Node.js",
    secondary: "NestJS, Prisma",
    learning: "AWS",
    avoid: "PHP",
    seniority: "middle",
  });

  const [expectations, setExpectations] = useState({
    preferredWorkModes: ["remote", "hybrid"] as Array<
      "remote" | "hybrid" | "onsite"
    >,
    minimumSalary: "",
    requiredBenefits: "",
    niceToHaveBenefits: "",
    locations: "Ho Chi Minh City",
    note: "",
  });

  const [filters, setFilters] = useState({
    remoteOnly: false,
    hybridOnly: false,
    hasInsurance: false,
    hideRedFlags: false,
    minScore: 0,
    strongOnly: false,
    salaryKnown: false,
    companyFilter: "",
    techFilter: "",
  });

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [drawerJob, setDrawerJob] = useState<Job | null>(null);

  const previewKeywords = buildSearchKeywords({
    techStack: {
      primary: techStack.primary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      secondary: techStack.secondary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      learning: techStack.learning
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      avoid: techStack.avoid
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      seniority: techStack.seniority || undefined,
    } satisfies CandidateTechStack,
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const em = (() => {
        try {
          return JSON.parse(job.expectationMatches ?? "{}");
        } catch {
          return {};
        }
      })();
      const rf = (() => {
        try {
          return JSON.parse(job.redFlags ?? "[]") as string[];
        } catch {
          return [];
        }
      })();
      if (
        filters.remoteOnly &&
        job.workMode !== "remote" &&
        em?.workMode !== true
      )
        return false;
      if (filters.hybridOnly && job.workMode !== "hybrid") return false;
      if (filters.hasInsurance && em?.socialInsurance !== true) return false;
      if (filters.hideRedFlags && rf.length > 0) return false;
      if (filters.minScore > 0 && (job.score ?? 0) < filters.minScore)
        return false;
      if (filters.strongOnly && job.fitLevel !== "strong") return false;
      if (filters.salaryKnown && !job.salary) return false;
      if (
        filters.companyFilter &&
        !job.company
          ?.toLowerCase()
          .includes(filters.companyFilter.toLowerCase())
      )
        return false;
      if (
        filters.techFilter &&
        !job.detectedTechStack
          ?.toLowerCase()
          .includes(filters.techFilter.toLowerCase())
      )
        return false;
      return true;
    });
  }, [jobs, filters]);

  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }

  async function generateCoverLetter(
    job: Job,
    style = "professional",
    messageType = "cover_letter",
  ) {
    if (!profile.trim()) {
      setError("Enter your profile to generate a cover letter.");
      return;
    }
    setLoadingCover((prev) => ({ ...prev, [job.id]: true }));
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          job: {
            title: job.title,
            company: job.company,
            description: job.description,
            salary: job.salary,
            workMode: job.workMode,
            matchedSkills: parseJsonArray(job.matchedSkills),
            missingSkills: parseJsonArray(job.missingSkills),
            reason: job.reason,
          },
          style,
          messageType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cover letter failed");
      setCoverLetters((prev) => ({ ...prev, [job.id]: data.coverLetter }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover letter failed");
    } finally {
      setLoadingCover((prev) => ({ ...prev, [job.id]: false }));
    }
  }

  function loadPreset(preset: SearchPreset) {
    if (preset.siteUrl) setSiteUrl(preset.siteUrl);
    if (preset.keyword) setKeyword(preset.keyword);
    if (preset.location) setLocation(preset.location);
    if (preset.techStack) {
      try {
        setTechStack(JSON.parse(preset.techStack));
      } catch {
        /* ignore */
      }
    }
    if (preset.expectations) {
      try {
        setExpectations(JSON.parse(preset.expectations));
      } catch {
        /* ignore */
      }
    }
  }

  async function savePreset() {
    const name = window.prompt("Preset name:");
    if (!name?.trim()) return;
    setSavingPreset(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildPresetPayload({
            name: name.trim(),
            siteUrl,
            keyword,
            location,
            techStack,
            expectations,
          }),
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save preset");
      setPresets((prev) => [...prev, data.preset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preset");
    } finally {
      setSavingPreset(false);
    }
  }

  async function deletePreset(id: number) {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/presets/${id}`, { method: "DELETE" });
    } catch {
      try {
        const res = await fetch("/api/presets");
        const data = await res.json();
        if (res.ok) setPresets(data.presets);
      } catch {
        /* ignore */
      }
    }
  }

  async function updateJobStatus(jobId: number, status: JobStatus) {
    const prevJobStatus = jobs.find((j) => j.id === jobId)?.status ?? "new";
    const prevSavedStatus =
      savedJobs.find((j) => j.id === jobId)?.status ?? "new";
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    setSavedJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
    );
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Could not update status");
      }
    } catch (e) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: prevJobStatus } : j)),
      );
      setSavedJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, status: prevSavedStatus } : j,
        ),
      );
      setError(e instanceof Error ? e.message : "Could not update status");
    }
  }

  function reset() {
    setCurrentStep(1);
    setJobs([]);
    setCoverLetters({});
    setDuplicateCount(0);
    setNotice(null);
    setError(null);
  }

  const sortedJobs = [...jobs].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );
  const sortedFilteredJobs = [...filteredJobs].sort(
    (a, b) => (b.score ?? -1) - (a.score ?? -1),
  );
  const topJobs = sortedFilteredJobs.filter((j) => (j.score ?? -1) >= 70);
  const otherJobs = sortedFilteredJobs.filter((j) => (j.score ?? -1) < 70);
  const profileSetupState = getProfileSetupState({
    hasSavedProfile: Boolean(savedProfile),
    loadingProfile,
    hasSelectedFile: Boolean(profileFile),
    sourceName: savedProfile?.sourceName,
  });
  const selectedSite =
    SUPPORTED_SITES.find((option) => option.baseUrl === siteUrl) ??
    SUPPORTED_SITES[0];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-5">
      {/* Stepper */}
      <Stepper current={currentStep} />

      <div className="bg-white border border-stone-200 rounded-xl px-5 py-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Mining history</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {loadingSavedJobs
                ? "Loading..."
                : `${savedJobs.length} AI matched job${savedJobs.length === 1 ? "" : "s"} · ${miningRuns.length} run${miningRuns.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => setHistoryOpen((p) => !p)}
            className="text-xs font-bold text-orange-600 border border-orange-200 bg-orange-50 rounded-lg px-3 py-2 hover:bg-orange-100"
          >
            {historyOpen ? "Hide" : "View history"}
          </button>
        </div>

        {historyOpen && (
          <div className="border-t border-stone-100 pt-3 space-y-2">
            {miningRuns.length === 0 && (
              <p className="text-sm text-stone-400 italic">
                No mining runs yet.
              </p>
            )}
            {miningRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-stone-100 bg-stone-50 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-semibold text-stone-800 truncate">
                    {run.keywords}
                  </p>
                  <p className="text-stone-500">
                    {run.site}
                    {run.location ? ` · ${run.location}` : ""}
                  </p>
                  <p className="text-stone-400">
                    {run.found} found · {run.scored} scored ·{" "}
                    {new Date(run.createdAt).toLocaleDateString()}
                  </p>
                  {run.errors && <p className="text-amber-600">⚠ Has errors</p>}
                </div>
                <button
                  onClick={() => {
                    setSiteUrl(`https://${run.site}`);
                    setKeyword(run.keywords.split(",")[0].trim());
                    setLocation(run.location ?? "");
                    setCurrentStep(1);
                  }}
                  className="shrink-0 text-xs text-orange-600 border border-orange-200 bg-orange-50 rounded px-2 py-1 hover:bg-orange-100"
                >
                  Rerun
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {notice && (
        <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}

      {/* Step 1: Configure */}
      {currentStep === 1 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Configure your search
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Save your CV profile once, then mine jobs without retyping it.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    CV Profile
                  </label>
                  <p className="text-xs text-stone-500 mt-1">
                    {profileSetupState.statusText}
                  </p>
                </div>
                {savedProfile && (
                  <span className="shrink-0 rounded-full bg-white border border-orange-200 px-2 py-1 text-[10px] font-bold text-orange-600">
                    Saved
                  </span>
                )}
              </div>

              {profile && (
                <div className="bg-white border border-stone-200 rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                    AI summary
                  </p>
                  <p className="mt-1 text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {profile}
                  </p>
                </div>
              )}

              {profileSetupState.showUploader ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) =>
                      setProfileFile(e.target.files?.[0] ?? null)
                    }
                    className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-stone-700 hover:file:bg-stone-100"
                  />
                  <button
                    onClick={uploadCvProfile}
                    disabled={profileSetupState.disableAction}
                    className="shrink-0 text-xs font-bold text-white rounded-lg px-3 py-2 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(90deg,#f97316,#ec4899)",
                      boxShadow: "0 2px 8px rgba(249,115,22,.18)",
                    }}
                  >
                    {profileSetupState.actionLabel}
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs text-orange-700">
                  Your CV profile is already saved. Future mining runs reuse it
                  automatically.
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Job source
              </label>
              <select
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              >
                {SUPPORTED_SITES.map((site) => (
                  <option key={site.name} value={site.baseUrl}>
                    {site.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 mt-1">
                Public search only. Current source: {selectedSite.label}.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Keywords
              </label>
              <input
                autoComplete="off"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="React Node.js Fullstack"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Location
              </label>
              <select
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="Ho Chi Minh City">Ho Chi Minh City</option>
                <option value="Hanoi">Hanoi</option>
                <option value="Da Nang">Da Nang</option>
                <option value="">Anywhere</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Analyze limit
              </label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={limit}
                onChange={(e) =>
                  setLimit(
                    Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                  )
                }
              />
              <p className="text-[11px] text-stone-400 mt-1">
                AI will crawl, extract, and rank up to {limit} jobs per run.
              </p>
            </div>

            {/* Tech Stack Section */}
            <div className="mt-4 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">
                Tech Stack
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Primary Stack *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={techStack.primary}
                    onChange={(e) =>
                      setTechStack((prev) => ({
                        ...prev,
                        primary: e.target.value,
                      }))
                    }
                    placeholder="React, Next.js, TypeScript"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Secondary Stack
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={techStack.secondary}
                    onChange={(e) =>
                      setTechStack((prev) => ({
                        ...prev,
                        secondary: e.target.value,
                      }))
                    }
                    placeholder="NestJS, Prisma"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Learning
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={techStack.learning}
                    onChange={(e) =>
                      setTechStack((prev) => ({
                        ...prev,
                        learning: e.target.value,
                      }))
                    }
                    placeholder="AWS, Kubernetes"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Avoid Tech
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={techStack.avoid}
                    onChange={(e) =>
                      setTechStack((prev) => ({
                        ...prev,
                        avoid: e.target.value,
                      }))
                    }
                    placeholder="PHP, jQuery"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs text-stone-500 mb-1">
                  Seniority
                </label>
                <select
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  value={techStack.seniority}
                  onChange={(e) =>
                    setTechStack((prev) => ({
                      ...prev,
                      seniority: e.target.value as typeof techStack.seniority,
                    }))
                  }
                >
                  <option value="">Not specified</option>
                  <option value="intern">Intern</option>
                  <option value="junior">Junior</option>
                  <option value="middle">Middle</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>

            {/* Expectations Section */}
            <div className="mt-4 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-3">
                Expectations
              </h3>
              <div className="mb-3">
                <label className="block text-xs text-stone-500 mb-1">
                  Work Modes
                </label>
                <div className="flex gap-3">
                  {(["remote", "hybrid", "onsite"] as const).map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-1 text-sm capitalize cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={expectations.preferredWorkModes.includes(mode)}
                        onChange={(e) => {
                          setExpectations((prev) => ({
                            ...prev,
                            preferredWorkModes: e.target.checked
                              ? [...prev.preferredWorkModes, mode]
                              : prev.preferredWorkModes.filter(
                                  (m) => m !== mode,
                                ),
                          }));
                        }}
                      />
                      {mode}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Min Salary
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={expectations.minimumSalary}
                    onChange={(e) =>
                      setExpectations((prev) => ({
                        ...prev,
                        minimumSalary: e.target.value,
                      }))
                    }
                    placeholder="e.g. $2000/month"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">
                    Locations
                  </label>
                  <input
                    type="text"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={expectations.locations}
                    onChange={(e) =>
                      setExpectations((prev) => ({
                        ...prev,
                        locations: e.target.value,
                      }))
                    }
                    placeholder="Ho Chi Minh City"
                  />
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="mt-4 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-stone-700">
                  Presets
                </h3>
                <button
                  onClick={savePreset}
                  disabled={savingPreset}
                  className="text-xs text-orange-600 border border-orange-200 bg-orange-50 rounded-lg px-2 py-1 hover:bg-orange-100 disabled:opacity-50"
                >
                  {savingPreset ? "Saving…" : "Save current"}
                </button>
              </div>
              {presets.length === 0 ? (
                <p className="text-xs text-stone-400 italic">
                  No saved presets.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-0.5 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1"
                    >
                      <button
                        onClick={() => loadPreset(preset)}
                        className="text-xs text-stone-700 hover:text-orange-600 mr-1"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="text-[10px] text-stone-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Keyword preview */}
            {previewKeywords.length > 0 && (
              <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-100">
                <p className="text-xs text-stone-500 mb-2 font-medium">
                  Keywords from your tech stack:
                </p>
                <div className="flex flex-wrap gap-1">
                  {previewKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs bg-white border border-stone-200 text-stone-600 px-2 py-0.5 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={mine}
              disabled={loadingMine || !profile.trim()}
              className="text-white text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg,#f97316,#ec4899)",
                boxShadow: "0 2px 8px rgba(249,115,22,.25)",
              }}
            >
              AI Analyze Jobs →
            </button>
            <span className="text-[11px] text-stone-400">
              {profile.trim() ? "Step 1 of 3" : "Upload a CV to start"}
            </span>
          </div>
        </div>
      )}

      {/* Step 2: Analyze */}
      {currentStep === 2 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Analyzing jobs from {selectedSite.label}…
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Crawling broadly, filtering with AI, and scoring{" "}
              <strong className="text-stone-700">{keyword}</strong> jobs. This
              can take 15–30 seconds.
            </p>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full w-3/5 animate-pulse"
              style={{ background: "linear-gradient(90deg,#f97316,#ec4899)" }}
            />
          </div>
          <div className="space-y-2 text-sm text-stone-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              Launched browser
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              Navigated to {selectedSite.label} search
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 animate-pulse" />
              Generating role-intent keywords, filtering hard matches, and
              ranking fit…
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === 3 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              AI matched jobs
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              These results are already ranked by fit against your profile, tech
              stack, and expectations.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700 font-semibold">
            AI matched {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          </div>

          {duplicateCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600 font-semibold">
              {duplicateCount} already matched job
              {duplicateCount !== 1 ? "s" : ""} skipped
            </div>
          )}

          {jobs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Ranked preview
              </p>
              <div className="border border-stone-100 rounded-lg overflow-hidden divide-y divide-stone-100">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="px-3 py-2 text-sm text-stone-700 bg-stone-50"
                  >
                    <span className="font-medium">{job.title}</span>
                    {job.company && (
                      <span className="text-stone-400"> · {job.company}</span>
                    )}
                  </div>
                ))}
                {jobs.length > 5 && (
                  <div className="px-3 py-2 text-xs text-stone-400 bg-stone-50">
                    +{jobs.length - 5} more jobs
                  </div>
                )}
              </div>
            </div>
          )}

          {jobs.length === 0 && (
            <p className="text-sm text-stone-400 italic">
              No AI matched jobs are available for this run.
            </p>
          )}

          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-800 leading-relaxed">
            {profile || (
              <span className="italic text-stone-400">No profile entered</span>
            )}
          </div>

          {error && (
            <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                setError(null);
                setCurrentStep(1);
              }}
              className="text-sm text-stone-500 border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-50"
            >
              ← Back
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Your Results
              </h2>
              <p className="text-sm text-stone-500 mt-0.5">
                <span className="text-orange-500 font-bold">
                  {topJobs.length} strong match
                  {topJobs.length !== 1 ? "es" : ""}
                </span>{" "}
                out of {jobs.length} AI matched jobs
              </p>
            </div>
            <button
              onClick={reset}
              className="text-sm text-stone-500 border border-stone-200 rounded-lg px-3 py-2 hover:bg-stone-50 shrink-0"
            >
              ↺ Analyze Again
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "remoteOnly", label: "Remote only" },
              { key: "hybridOnly", label: "Hybrid only" },
              { key: "hasInsurance", label: "Has insurance" },
              { key: "hideRedFlags", label: "Hide red flags" },
              { key: "strongOnly", label: "Strong fit only" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof filters],
                  }))
                }
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filters[key as keyof typeof filters]
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-1">
              <span className="text-xs text-stone-500">Min score:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={filters.minScore}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minScore: Number(e.target.value),
                  }))
                }
                className="w-14 border border-stone-200 rounded px-2 py-1 text-xs"
              />
            </div>
            <button
              onClick={() => setShowMoreFilters((p) => !p)}
              className="px-3 py-1 rounded-full text-xs border bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            >
              {showMoreFilters ? "Less filters ▲" : "More filters ▼"}
            </button>
            {showMoreFilters && (
              <div className="flex flex-wrap gap-2 mt-2 w-full">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      salaryKnown: !prev.salaryKnown,
                    }))
                  }
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    filters.salaryKnown
                      ? "bg-stone-800 text-white border-stone-800"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  Salary known
                </button>
                <input
                  type="text"
                  placeholder="Company..."
                  value={filters.companyFilter}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      companyFilter: e.target.value,
                    }))
                  }
                  className="border border-stone-200 rounded-full px-3 py-1 text-xs bg-white text-stone-700 focus:outline-none focus:border-orange-400 w-36"
                />
                <input
                  type="text"
                  placeholder="Tech (e.g. React)..."
                  value={filters.techFilter}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      techFilter: e.target.value,
                    }))
                  }
                  className="border border-stone-200 rounded-full px-3 py-1 text-xs bg-white text-stone-700 focus:outline-none focus:border-orange-400 w-44"
                />
              </div>
            )}
          </div>

          {sortedFilteredJobs.length === 0 && (
            <p className="text-sm text-stone-400 italic">
              No AI matched jobs to display.
            </p>
          )}

          {topJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                Top Matches
              </p>
              {topJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  coverLetter={coverLetters[job.id]}
                  loading={loadingCover[job.id] ?? false}
                  onGenerate={(s, m) => generateCoverLetter(job, s, m)}
                  isTop
                  compareSelected={compareIds.has(job.id)}
                  onToggleCompare={() => toggleCompare(job.id)}
                  onViewDetails={() => setDrawerJob(job)}
                  onStatusChange={(s) => updateJobStatus(job.id, s)}
                />
              ))}
            </div>
          )}

          {otherJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                Other Results
              </p>
              {otherJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  coverLetter={coverLetters[job.id]}
                  loading={loadingCover[job.id] ?? false}
                  onGenerate={(s, m) => generateCoverLetter(job, s, m)}
                  isTop={false}
                  compareSelected={compareIds.has(job.id)}
                  onToggleCompare={() => toggleCompare(job.id)}
                  onViewDetails={() => setDrawerJob(job)}
                  onStatusChange={(s) => updateJobStatus(job.id, s)}
                />
              ))}
            </div>
          )}

          {compareIds.size >= 2 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                Comparison ({compareIds.size} jobs)
              </p>
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${compareIds.size}, 1fr)`,
                }}
              >
                {sortedJobs
                  .filter((j) => compareIds.has(j.id))
                  .map((job) => (
                    <div
                      key={job.id}
                      className="border border-orange-200 rounded-xl p-3 space-y-2 text-xs"
                    >
                      <p className="font-bold text-stone-900 text-sm">
                        {job.title}
                      </p>
                      <p className="text-stone-500">{job.company ?? "-"}</p>
                      <div className="space-y-1">
                        <Row
                          label="Score"
                          value={job.score !== null ? String(job.score) : "-"}
                        />
                        <Row label="Fit" value={job.fitLevel ?? "-"} />
                        <Row
                          label="Work mode"
                          value={job.workMode ?? "unknown"}
                        />
                        <Row label="Salary" value={job.salary ?? "unknown"} />
                        <Row
                          label="Matched"
                          value={
                            parseJsonArray(job.matchedSkills)
                              .slice(0, 5)
                              .join(", ") || "-"
                          }
                        />
                        <Row
                          label="Missing"
                          value={
                            parseJsonArray(job.missingSkills)
                              .slice(0, 5)
                              .join(", ") || "-"
                          }
                        />
                        <Row
                          label="Red flags"
                          value={
                            parseJsonArray(job.redFlags).join(", ") || "none"
                          }
                        />
                        <div className="flex gap-1">
                          <span className="text-stone-400 shrink-0 w-20">
                            Insurance
                          </span>
                          <TriStateIcon
                            value={(() => {
                              try {
                                return JSON.parse(
                                  job.expectationMatches ?? "{}",
                                ).socialInsurance;
                              } catch {
                                return undefined;
                              }
                            })()}
                          />
                        </div>
                        <div className="flex gap-1">
                          <span className="text-stone-400 shrink-0 w-20">
                            Location
                          </span>
                          <TriStateIcon
                            value={(() => {
                              try {
                                return JSON.parse(
                                  job.expectationMatches ?? "{}",
                                ).location;
                              } catch {
                                return undefined;
                              }
                            })()}
                          />
                        </div>
                        {job.reason && (
                          <div className="flex gap-1">
                            <span className="text-stone-400 shrink-0 w-20">
                              Reason
                            </span>
                            <span className="text-stone-700 text-xs leading-relaxed">
                              {job.reason.slice(0, 120)}
                              {job.reason.length > 120 ? "…" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
      {drawerJob && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setDrawerJob(null)}
          />
          <div className="w-full max-w-2xl bg-white overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-stone-800">
                {drawerJob.title}
              </h2>
              <button
                onClick={() => setDrawerJob(null)}
                className="text-stone-400 hover:text-stone-600 text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-2">
              {drawerJob.company} · {drawerJob.location}
            </p>
            <a
              href={drawerJob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mb-4 block"
            >
              Open original job page →
            </a>

            <div className="flex gap-2 mb-4 flex-wrap">
              {drawerJob.score !== null && (
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${drawerJob.score >= 70 ? "bg-green-100 text-green-800" : drawerJob.score >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                >
                  Score: {drawerJob.score}
                </span>
              )}
              {drawerJob.fitLevel && (
                <span className="px-2 py-1 rounded text-xs bg-stone-100 text-stone-700 capitalize">
                  {drawerJob.fitLevel}
                </span>
              )}
              {drawerJob.workMode && (
                <span
                  className={`px-2 py-1 rounded text-xs ${drawerJob.workMode === "remote" ? "bg-green-50 text-green-700" : drawerJob.workMode === "hybrid" ? "bg-blue-50 text-blue-700" : "bg-stone-100 text-stone-600"}`}
                >
                  {drawerJob.workMode}
                </span>
              )}
              {drawerJob.salary && (
                <span className="px-2 py-1 rounded text-xs bg-amber-50 text-amber-700">
                  {drawerJob.salary}
                </span>
              )}
            </div>

            {drawerJob.reason && (
              <p className="text-sm text-stone-600 mb-4">{drawerJob.reason}</p>
            )}

            {drawerJob.detectedTechStack &&
              (() => {
                try {
                  const techs = JSON.parse(
                    drawerJob.detectedTechStack,
                  ) as string[];
                  return techs.length > 0 ? (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-stone-500 mb-1">
                        Detected Tech Stack
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {techs.map((t) => (
                          <span
                            key={t}
                            className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                } catch {
                  return null;
                }
              })()}

            {drawerJob.redFlags &&
              (() => {
                try {
                  const flags = JSON.parse(drawerJob.redFlags) as string[];
                  return flags.length > 0 ? (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs font-medium text-red-700 mb-1">
                        Red Flags
                      </p>
                      {flags.map((f) => (
                        <p key={f} className="text-xs text-red-600">
                          • {f}
                        </p>
                      ))}
                    </div>
                  ) : null;
                } catch {
                  return null;
                }
              })()}

            <details open>
              <summary className="text-sm font-medium text-stone-700 cursor-pointer mb-2">
                Full job description
              </summary>
              <pre className="whitespace-pre-wrap text-xs text-stone-600 bg-stone-50 p-3 rounded-lg max-h-96 overflow-y-auto">
                {drawerJob.description}
              </pre>
            </details>
          </div>
        </div>
      )}
    </main>
  );
}
