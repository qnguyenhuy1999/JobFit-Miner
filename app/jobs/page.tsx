"use client";

import { useEffect, useMemo, useState } from "react";

type Job = {
  id: number;
  site: string;
  title: string;
  company: string | null;
  location: string | null;
  score: number | null;
  fitLevel: string | null;
  status: string;
  createdAt: string;
  url: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

const INITIAL_PAGINATION: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  pageCount: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const STATUS_OPTIONS = ["new", "saved", "interested", "applied", "rejected", "ignored"] as const;
type JobStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<JobStatus, string> = {
  new: "bg-stone-100 text-stone-600",
  saved: "bg-blue-50 text-blue-600",
  interested: "bg-orange-50 text-orange-600",
  applied: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-500",
  ignored: "bg-stone-50 text-stone-400",
};

const FIT_COLORS: Record<string, string> = {
  strong: "bg-green-50 text-green-700",
  partial: "bg-orange-50 text-orange-600",
  low: "bg-red-50 text-red-500",
};

function StatusBadge({ status, jobId, onChange }: { status: string; jobId: number; onChange: (id: number, s: string) => void }) {
  const [open, setOpen] = useState(false);
  const color = STATUS_COLORS[status as JobStatus] ?? "bg-stone-100 text-stone-500";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${color}`}
      >
        {status}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-32 rounded-lg border border-stone-200 bg-white shadow-md">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(jobId, s); setOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-xs capitalize hover:bg-stone-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("");
  const [location, setLocation] = useState("");
  const [minScore, setMinScore] = useState("");
  const [status, setStatus] = useState("");
  const [hideRejected, setHideRejected] = useState(false);
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const search = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (query.trim()) search.set("query", query.trim());
    if (site) search.set("site", site);
    if (location.trim()) search.set("location", location.trim());
    if (minScore) search.set("minScore", minScore);
    if (status) search.set("status", status);
    if (hideRejected) search.set("hideRejected", "1");
    return search;
  }, [location, minScore, page, query, site, status, hideRejected]);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json();
        setJobs(data.jobs ?? []);
        setPagination(data.pagination ?? INITIAL_PAGINATION);
      } finally {
        setLoading(false);
      }
    }
    void loadJobs();
  }, [params]);

  async function handleStatusChange(jobId: number, newStatus: string) {
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: newStatus } : j));
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  function resetPage() { setPage(1); }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input
          value={query}
          onChange={(e) => { resetPage(); setQuery(e.target.value); }}
          placeholder="Search title, company, location"
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <select
          value={site}
          onChange={(e) => { resetPage(); setSite(e.target.value); }}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          <option value="">All sites</option>
          <option value="itviec">ITviec</option>
          <option value="linkedin">LinkedIn</option>
          <option value="topcv">TopCV</option>
          <option value="vietnamworks">VietnamWorks</option>
        </select>
        <input
          value={location}
          onChange={(e) => { resetPage(); setLocation(e.target.value); }}
          placeholder="Filter by location"
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <select
          value={minScore}
          onChange={(e) => { resetPage(); setMinScore(e.target.value); }}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          <option value="">Any score</option>
          <option value="40">40+</option>
          <option value="70">70+</option>
        </select>
        <select
          value={status}
          onChange={(e) => { resetPage(); setStatus(e.target.value); }}
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideRejected}
            onChange={(e) => { resetPage(); setHideRejected(e.target.checked); }}
            className="accent-orange-500"
          />
          Hide rejected / ignored
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div>
            <h1 className="text-base font-bold text-stone-900">Saved jobs</h1>
            <p className="text-sm text-stone-500">
              {loading ? "Loading jobs..." : `${pagination.total} matching jobs`}
            </p>
          </div>
          <div className="text-xs text-stone-500">
            Page {pagination.page} / {pagination.pageCount}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead className="bg-stone-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-stone-100 text-sm text-stone-700">
                  <td className="px-4 py-3">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-stone-900 hover:text-orange-600"
                    >
                      {job.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 capitalize">{job.site}</td>
                  <td className="px-4 py-3">{job.company ?? "-"}</td>
                  <td className="px-4 py-3">{job.location ?? "-"}</td>
                  <td className="px-4 py-3">
                    {job.score !== null ? (
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${FIT_COLORS[job.fitLevel ?? ""] ?? "bg-stone-100 text-stone-600"}`}>
                        {job.score}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} jobId={job.id} onChange={handleStatusChange} />
                  </td>
                  <td className="px-4 py-3">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!loading && jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-stone-400">
                    No jobs match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
          <button
            onClick={() => setPage((c) => Math.max(1, c - 1))}
            disabled={!pagination.hasPreviousPage}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((c) => c + 1)}
            disabled={!pagination.hasNextPage}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
