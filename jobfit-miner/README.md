# JobFit Miner

Mine jobs from Vietnamese job boards, score them against your profile with AI, and generate tailored cover letters.

## Setup

```bash
cp .env.example .env
# edit .env and fill in your values
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:./dev.db` |
| `OPENAI_API_KEY` | No | Enables AI scoring + cover letters. Falls back to local keyword scoring without it. |
| `OPENAI_BASE_URL` | No | Override the API base URL for compatible providers. |
| `PLAYWRIGHT_HEADFUL` | No | Set to `1` to open a visible browser window when crawling (useful for debugging). |

## Supported job sites

- **ITviec** — `https://itviec.com`
- **TopCV** — `https://www.topcv.vn`
- **VietnamWorks** — `https://www.vietnamworks.com`
- **LinkedIn** — `https://www.linkedin.com` (public listings only)

## Features

- 4-step wizard: configure → mine → score → results
- AI scoring with structured output: score, fit level, matched/missing skills, expectation matches, red flags
- Multi-style cover letter + recruiter/LinkedIn/email message generation
- Job status tracking: new / saved / interested / applied / rejected / ignored
- Side-by-side comparison of up to 3 jobs
- Saved jobs page with filters: site, location, score, status, hide rejected
- Mining run history stored per session
- URL + fuzzy (title+company) deduplication

## Limitations

- Crawlers rely on DOM selectors that may break when job sites update their HTML.
- LinkedIn scraping is limited to public search results. No login, no session cookies.
- No auto-submit, no auto-login, no mass apply. All applications are manual.
- AI scoring quality depends on how well you write your profile and expectations.
- SQLite is used for local development. Not suitable for multi-user or cloud deployment without migration to a hosted database.
- `PLAYWRIGHT_HEADFUL=0` (headless) may be blocked by some sites. Set to `1` and solve CAPTCHAs manually if crawling fails.
