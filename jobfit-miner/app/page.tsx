"use client";

import { useState } from "react";

type Job = {
  id: number;
  site: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string | null;
  score: number | null;
  reason: string | null;
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
            <div key={label} className="flex items-center flex-1 last:flex-none">
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
                      ? { background: "linear-gradient(135deg,#f97316,#ec4899)" }
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

function JobCard({
  job,
  coverLetter,
  loading,
  onGenerate,
  isTop,
}: {
  job: Job;
  coverLetter?: string;
  loading: boolean;
  onGenerate: () => void;
  isTop: boolean;
}) {
  return (
    <div
      className={[
        "border rounded-xl p-4 space-y-2 transition-shadow",
        isTop ? "border-orange-200" : "border-stone-200",
        (job.score ?? 100) < 40 ? "opacity-60" : "",
      ].join(" ")}
      style={isTop ? { boxShadow: "0 2px 12px rgba(249,115,22,.08)" } : undefined}
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

      {job.reason && (
        <p className="text-xs text-orange-700 italic leading-relaxed">
          &ldquo;{job.reason}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-orange-500 font-semibold hover:underline"
        >
          View job ↗
        </a>
        {!coverLetter && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2.5 py-1 hover:bg-orange-100 disabled:opacity-50"
          >
            {loading ? "Generating…" : "✉ Generate cover letter"}
          </button>
        )}
        {coverLetter && (
          <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-md px-2.5 py-1 opacity-60">
            ✉ Cover letter ▾
          </span>
        )}
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
  const [location, setLocation] = useState("ho-chi-minh-hcm");
  const [profile, setProfile] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [coverLetters, setCoverLetters] = useState<Record<number, string>>({});
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [loadingCover, setLoadingCover] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function mine() {
    setError(null);
    setLoadingMine(true);
    setCurrentStep(2);
    try {
      const res = await fetch("/api/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, keyword, location: location || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mine failed");
      setJobs(data.jobs);
      setCurrentStep(3);
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
        body: JSON.stringify({ profile }),
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

  async function generateCoverLetter(job: Job) {
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
          },
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
    setError(null);
  }

  const sortedJobs = [...jobs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const topJobs = sortedJobs.filter((j) => (j.score ?? -1) >= 70);
  const otherJobs = sortedJobs.filter((j) => (j.score ?? -1) < 70);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ background: "linear-gradient(135deg,#f97316,#ec4899)" }}
        >
          ⛏
        </div>
        <div>
          <div
            className="text-xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg,#f97316,#ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            JobFit Miner
          </div>
          <div className="text-xs text-stone-400">
            Mine jobs. Score your fit. Ship cover letters.
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper current={currentStep} />

      {/* Step 1: Configure */}
      {currentStep === 1 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Configure your search</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Set where to look and what you&apos;re looking for.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Job Site URL
              </label>
              <input
                autoComplete="off"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://itviec.com"
              />
              <p className="text-[11px] text-stone-400 mt-1">Currently supports ITviec.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Keywords
              </label>
              <input
                autoComplete="off"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="ho-chi-minh-hcm">Ho Chi Minh City</option>
                <option value="ha-noi">Hanoi</option>
                <option value="da-nang">Da Nang</option>
                <option value="">Anywhere</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
                Your Profile & Skills
              </label>
              <textarea
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                rows={4}
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="e.g. 3 years React, 2 years Node.js, TypeScript, PostgreSQL..."
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Used for AI scoring and cover letter generation.
              </p>
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
              disabled={loadingMine}
              className="text-white text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg,#f97316,#ec4899)",
                boxShadow: "0 2px 8px rgba(249,115,22,.25)",
              }}
            >
              Mine Jobs →
            </button>
            <span className="text-[11px] text-stone-400">Step 1 of 4</span>
          </div>
        </div>
      )}

      {/* Step 2: Mining */}
      {currentStep === 2 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Mining ITviec…</h2>
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
              Navigated to ITviec search
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
              <h2 className="text-base font-bold text-stone-900">Your Results</h2>
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
            <p className="text-sm text-stone-400 italic">No scored jobs to display.</p>
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
                  onGenerate={() => generateCoverLetter(job)}
                  isTop
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
                  onGenerate={() => generateCoverLetter(job)}
                  isTop={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
