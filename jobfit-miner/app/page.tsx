"use client";

import { useEffect, useState } from "react";
import { getProfileSetupState } from "@/lib/profile-setup";
import { SUPPORTED_SITES } from "@/crawlers/sites";

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
  status: string;
  createdAt?: string;
};

type CandidateProfile = {
  id: number;
  summary: string;
  sourceName: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Step = 1 | 2 | 3 | 4;

const STEPS = ["Configure", "Mine", "Score", "Results"];

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
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <span className="text-stone-400 shrink-0 w-20">{label}</span>
      <span className="text-stone-700">{value}</span>
    </div>
  );
}

const COVER_STYLES = ["professional", "friendly", "short", "startup", "corporate", "vietnamese", "bilingual"] as const;
const MESSAGE_TYPES = [
  { value: "cover_letter", label: "Cover letter" },
  { value: "recruiter_message", label: "Recruiter msg" },
  { value: "linkedin_message", label: "LinkedIn msg" },
  { value: "email_application", label: "Email application" },
  { value: "resume_tips", label: "Resume tips" },
] as const;

function CoverLetterControls({ job, coverLetter, loading, onGenerate }: {
  job: Job;
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
      <select value={style} onChange={(e) => setStyle(e.target.value)}
        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-stone-50 text-stone-700 outline-none focus:border-orange-400">
        {COVER_STYLES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
      </select>
      <select value={messageType} onChange={(e) => setMessageType(e.target.value)}
        className="text-xs border border-stone-200 rounded-md px-2 py-1 bg-stone-50 text-stone-700 outline-none focus:border-orange-400">
        {MESSAGE_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <button onClick={() => onGenerate(style, messageType)} disabled={loading}
        className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2.5 py-1 hover:bg-orange-100 disabled:opacity-50">
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
}: {
  job: Job;
  coverLetter?: string;
  loading: boolean;
  onGenerate: (style: string, messageType: string) => void;
  isTop: boolean;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
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
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 font-semibold hover:underline">
          View job ↗
        </a>
        {onToggleCompare && (
          <label className="flex items-center gap-1 text-xs text-stone-500 cursor-pointer">
            <input type="checkbox" checked={compareSelected} onChange={onToggleCompare} className="accent-orange-500" />
            Compare
          </label>
        )}
        <CoverLetterControls job={job} coverLetter={coverLetter} loading={loading} onGenerate={onGenerate} />
      </div>

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
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(false);
  const [loadingCover, setLoadingCover] = useState<Record<number, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

    void loadSavedJobs();
    void loadCandidateProfile();
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
    setError(null);
    setNotice(null);
    setLoadingMine(true);
    setCurrentStep(2);
    try {
      const res = await fetch("/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteUrl,
          keyword,
          location: location || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mine failed");
      setJobs(data.jobs);
      setDuplicateCount(data.existingCount ?? 0);
      await refreshSavedJobs();
      if (data.existingCount > 0) {
        setNotice(
          `Ignored ${data.existingCount} already saved job${
            data.existingCount === 1 ? "" : "s"
          }. You can view them in Saved jobs.`,
        );
      }
      setCurrentStep(data.jobs.length > 0 ? 3 : 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mine failed");
      setCurrentStep(1);
    } finally {
      setLoadingMine(false);
    }
  }

  async function score() {
    if (!profile.trim()) {
      setError("Enter your profile before scoring.");
      return;
    }
    setError(null);
    setLoadingScore(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          expectations: profile,
          jobIds: jobs.map((job) => job.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Score failed");
      setJobs(data.jobs);
      setCurrentStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Score failed");
    } finally {
      setLoadingScore(false);
    }
  }

  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else if (next.size < 3) { next.add(id); }
      return next;
    });
  }

  async function generateCoverLetter(job: Job, style = "professional", messageType = "cover_letter") {
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
          job: { title: job.title, company: job.company, description: job.description },
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
  const topJobs = sortedJobs.filter((j) => (j.score ?? -1) >= 70);
  const otherJobs = sortedJobs.filter((j) => (j.score ?? -1) < 70);
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
            <h2 className="text-sm font-bold text-stone-900">Saved jobs</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {loadingSavedJobs
                ? "Loading your job archive..."
                : `${savedJobs.length} job${savedJobs.length === 1 ? "" : "s"} stored in the database`}
            </p>
          </div>
          <button
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="text-xs font-bold text-orange-600 border border-orange-200 bg-orange-50 rounded-lg px-3 py-2 hover:bg-orange-100"
          >
            {historyOpen ? "Hide History" : "View History"}
          </button>
        </div>

        {historyOpen && (
          <div className="border-t border-stone-100 pt-3 space-y-3">
            {savedJobs.length === 0 && (
              <p className="text-sm text-stone-400 italic">
                No saved jobs yet. Mine once and new matches will appear here.
              </p>
            )}
            {savedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                coverLetter={coverLetters[job.id]}
                loading={loadingCover[job.id] ?? false}
                onGenerate={(s, m) => generateCoverLetter(job, s, m)}
                isTop={(job.score ?? -1) >= 70}
              />
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
                    onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)}
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
                  Your CV profile is already saved. Future mining runs reuse it automatically.
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
              Mine Jobs →
            </button>
            <span className="text-[11px] text-stone-400">
              {profile.trim() ? "Step 1 of 4" : "Upload a CV to start"}
            </span>
          </div>
        </div>
      )}

      {/* Step 2: Mining */}
      {currentStep === 2 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Mining {selectedSite.label}…
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Searching for{" "}
              <strong className="text-stone-700">{keyword}</strong> jobs. This
              takes 15–30 seconds.
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
              Extracting job listings…
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Score */}
      {currentStep === 3 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Score against your profile
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              AI will rank each job by how well it fits your background.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700 font-semibold">
            ⛏ {jobs.length} job{jobs.length !== 1 ? "s" : ""} mined
          </div>

          {duplicateCount > 0 && (
            <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600 font-semibold">
              {duplicateCount} already saved job
              {duplicateCount !== 1 ? "s" : ""} ignored
            </div>
          )}

          {jobs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
                Preview
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
            <p className="text-sm text-stone-400 italic">No jobs were mined.</p>
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
              onClick={score}
              disabled={loadingScore || !profile.trim()}
              className="text-white text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg,#f97316,#ec4899)",
                boxShadow: "0 2px 8px rgba(249,115,22,.25)",
              }}
            >
              {loadingScore ? "Scoring…" : "Score Jobs →"}
            </button>
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
        </div>
      )}

      {/* Step 4: Results */}
      {currentStep === 4 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
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
                out of {sortedJobs.length} jobs
              </p>
            </div>
            <button
              onClick={reset}
              className="text-sm text-stone-500 border border-stone-200 rounded-lg px-3 py-2 hover:bg-stone-50 shrink-0"
            >
              ↺ Mine Again
            </button>
          </div>

          {sortedJobs.length === 0 && (
            <p className="text-sm text-stone-400 italic">
              No scored jobs to display.
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
                />
              ))}
            </div>
          )}

          {compareIds.size >= 2 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">
                Comparison ({compareIds.size} jobs)
              </p>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${compareIds.size}, 1fr)` }}>
                {sortedJobs.filter((j) => compareIds.has(j.id)).map((job) => (
                  <div key={job.id} className="border border-orange-200 rounded-xl p-3 space-y-2 text-xs">
                    <p className="font-bold text-stone-900 text-sm">{job.title}</p>
                    <p className="text-stone-500">{job.company ?? "-"}</p>
                    <div className="space-y-1">
                      <Row label="Score" value={job.score !== null ? String(job.score) : "-"} />
                      <Row label="Fit" value={job.fitLevel ?? "-"} />
                      <Row label="Work mode" value={job.workMode ?? "unknown"} />
                      <Row label="Salary" value={job.salary ?? "unknown"} />
                      <Row label="Matched" value={parseJsonArray(job.matchedSkills).slice(0, 5).join(", ") || "-"} />
                      <Row label="Missing" value={parseJsonArray(job.missingSkills).slice(0, 5).join(", ") || "-"} />
                      <Row label="Red flags" value={parseJsonArray(job.redFlags).join(", ") || "none"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
