import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ---- Types mirror pipeline/src/recon/dashboard_export.py ----
type Latest = {
  trade_date: string;
  match_rate: number;
  records_compared: number;
  matched: number;
  minor: number;
  major: number;
  quality_issues: number;
  top_failing_field: string | null;
  avg_break_pct: number;
  worst_break_pct: number;
  nse_symbols: number;
  bse_symbols: number;
  dual_listed: number;
  nse_only: number;
  bse_only: number;
};
type TrendPoint = {
  trade_date: string;
  match_rate: number;
  records_compared: number;
  matched: number;
  minor: number;
  major: number;
  quality_issues: number;
};
type CheckSplit = { check_type: string; match: number; minor: number; major: number };
type Bucket = { bucket: string; count: number };
type Rule = { rule: string; count: number };
type FailingField = { check_type: string; field: string; count: number };
type Break = {
  ticker: string;
  nse: number | null;
  bse: number | null;
  diff_abs: number | null;
  diff_pct: number | null;
  mismatch_score: number;
  status: string;
  name: string | null;
  isin: string | null;
};
type QueueRow = {
  check_type: string;
  trade_date: string;
  ticker: string;
  field: string;
  value_a: number | null;
  value_b: number | null;
  diff_pct: number | null;
  mismatch_score: number;
  status: "MATCH" | "MINOR" | "MAJOR";
  explanation: string | null;
};
type TriRow = {
  ticker: string;
  nse: number | null;
  bse: number | null;
  yahoo: number | null;
  median: number;
  spread_pct: number;
  outlier_source: string | null;
  status: string;
};
type TriSource = {
  summary: { adjudicated: number; confirmed_breaks: number; yahoo_rows: number };
  outlier_breakdown: { source: string; count: number }[];
  rows: TriRow[];
};
type Summary = {
  generated_at: string;
  threshold: number;
  latest: Latest | null;
  totals: { runs: number; total_compared: number; total_major: number; avg_match_rate: number | null };
  trend: TrendPoint[];
  check_split: CheckSplit[];
  score_buckets: Bucket[];
  quality_by_rule: Rule[];
  top_failing_fields: FailingField[];
  biggest_breaks: Break[];
  tri_source: TriSource;
  queue: QueueRow[];
};

const SOURCE_COLOR: Record<string, string> = {
  NSE: "#2f5fff",
  BSE: "#d92d20",
  YAHOO: "#7c3aed",
};

const C = {
  match: "var(--color-match)",
  minor: "var(--color-minor)",
  major: "var(--color-major)",
  accent: "var(--color-accent)",
};
const STATUS_COLOR: Record<string, string> = { MATCH: C.match, MINOR: C.minor, MAJOR: C.major };
const BUCKET_COLOR = ["#0f9d63", "#4bad78", "#b7791f", "#e08a2e", "#d92d20"];

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const num = (n: number) => n.toLocaleString("en-IN");
const money = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Sect({ n, title, sub, right }: { n: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-[var(--color-accent)] font-semibold">{n}</span>
        <div>
          <h2 className="font-display text-[16px] font-bold tracking-tight text-[var(--color-ink)]">
            {title}
          </h2>
          {sub && <p className="text-[12px] text-[var(--color-ink-mid)] mt-0.5">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl shadow-[0_1px_2px_rgba(16,19,26,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Panel className="p-5 flex flex-col justify-between min-h-[116px] hover:shadow-[0_4px_16px_rgba(16,19,26,0.07)] transition-shadow">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
        {label}
      </div>
      <div>
        <div className="font-mono tabular text-[28px] leading-none font-bold" style={{ color: tone ?? "var(--color-ink)" }}>
          {value}
        </div>
        {sub && <div className="mt-2 text-[11px] text-[var(--color-ink-mid)]">{sub}</div>}
      </div>
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? C.accent;
  return (
    <span
      className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border tracking-wide"
      style={{ color: c, borderColor: `${c}40`, background: `${c}10` }}
    >
      {status}
    </span>
  );
}

const tooltipStyle = {
  background: "#fff",
  border: "1px solid var(--color-line)",
  borderRadius: 8,
  fontFamily: "JetBrains Mono",
  fontSize: 11,
  boxShadow: "0 6px 24px rgba(16,19,26,0.10)",
};

export default function App() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "MAJOR" | "MINOR">("ALL");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(25);
  const [triVisible, setTriVisible] = useState(12);

  useEffect(() => {
    fetch("/recon/summary.json")
      .then((r) => {
        if (!r.ok) throw new Error(`summary.json ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  const queue = useMemo(() => {
    if (!data) return [];
    return data.queue
      .filter((r) => (filter === "ALL" ? true : r.status === filter))
      .filter((r) => (q ? r.ticker.toLowerCase().includes(q.toLowerCase()) : true));
  }, [data, filter, q]);

  // Reset pagination when the filter/search changes.
  useEffect(() => setVisible(25), [filter, q]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="font-display text-lg font-bold text-[var(--color-major)] mb-2">
            No reconciliation data
          </div>
          <p className="font-mono text-xs text-[var(--color-ink-mid)] leading-relaxed">
            Could not load <span className="text-[var(--color-ink)]">/recon/summary.json</span>. Run
            the pipeline first:
            <br />
            <span className="text-[var(--color-accent)]">cd pipeline &amp;&amp; .venv/bin/recon --backfill 8</span>
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.latest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-xs text-[var(--color-ink-faint)] animate-pulse">
          loading reconciliation feed…
        </div>
      </div>
    );
  }

  const L = data.latest;
  const healthy = L.match_rate >= data.threshold;
  const total = L.matched + L.minor + L.major || 1;
  const dist = [
    { label: "MATCH", v: L.matched, c: C.match },
    { label: "MINOR", v: L.minor, c: C.minor },
    { label: "MAJOR", v: L.major, c: C.major },
  ];
  const maxField = Math.max(...data.top_failing_fields.map((f) => f.count), 1);
  const universeMax = Math.max(L.nse_symbols, L.bse_symbols, 1);
  const coverage = [
    { label: "NSE listed", v: L.nse_symbols, c: "#2f5fff" },
    { label: "BSE listed", v: L.bse_symbols, c: "#7aa0ff" },
    { label: "Dual-listed (reconciled)", v: L.dual_listed, c: C.match },
    { label: "NSE-only (no BSE match)", v: L.nse_only, c: C.minor },
    { label: "BSE-only (no NSE match)", v: L.bse_only, c: "#c0c6d0" },
  ];

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header className="border-b border-[var(--color-line)] sticky top-0 z-20 bg-white/85 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div
              className="h-9 w-9 rounded-lg grid place-items-center font-display font-extrabold text-white"
              style={{ background: "linear-gradient(135deg,#2f5fff,#5b82ff)" }}
            >
              R
            </div>
            <div>
              <div className="font-display text-[15px] font-bold tracking-tight leading-tight">
                Reconciliation &amp; Data-Quality Console
              </div>
              <div className="text-[11px] text-[var(--color-ink-mid)]">
                NSE ⋈ BSE ⋈ Yahoo · Indian equity cash market · multi-source drift engine
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[9px] text-[var(--color-ink-faint)] uppercase tracking-wider">
                Session
              </span>
              <span className="font-mono text-[12px] font-medium text-[var(--color-ink)]">
                {L.trade_date}
              </span>
            </div>
            <div
              className="flex items-center gap-2 font-mono text-[11px] font-semibold px-3 py-1.5 rounded-lg border"
              style={{
                color: healthy ? C.match : C.major,
                borderColor: healthy ? "#0f9d6340" : "#d92d2040",
                background: healthy ? "#0f9d6310" : "#d92d2010",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: healthy ? C.match : C.major }}
              />
              {healthy ? "WITHIN SLA" : "SLA BREACH"}
            </div>
          </div>
        </div>
      </header>

      {/* Rollup strip */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-panel-2)]">
        <div className="max-w-[1280px] mx-auto px-6 py-2.5 flex flex-wrap gap-x-8 gap-y-1 font-mono text-[11px] text-[var(--color-ink-mid)]">
          <span>sessions reconciled <b className="text-[var(--color-ink)]">{data.totals.runs}</b></span>
          <span>records compared <b className="text-[var(--color-ink)]">{num(data.totals.total_compared)}</b></span>
          <span>avg match rate <b className="text-[var(--color-ink)]">{data.totals.avg_match_rate != null ? pct(data.totals.avg_match_rate) : "—"}</b></span>
          <span>total major breaks <b style={{ color: C.major }}>{num(data.totals.total_major)}</b></span>
          <span className="ml-auto text-[var(--color-ink-faint)]">generated {new Date(data.generated_at).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {/* KPI grid */}
        <section className="mb-10">
          <Sect n="01" title="Latest Session" sub={`Reconciliation outcome for ${L.trade_date}`} />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label="Match Rate" value={pct(L.match_rate)} sub={`SLA ${pct(data.threshold)}`} tone={healthy ? C.match : C.major} />
            <Kpi label="Reconciled Pairs" value={num(L.records_compared)} sub="dual-listed ticker×date" />
            <Kpi label="Major Breaks" value={num(L.major)} sub={`${((L.major / total) * 100).toFixed(1)}% of book`} tone={C.major} />
            <Kpi label="Minor Drift" value={num(L.minor)} sub={`${((L.minor / total) * 100).toFixed(1)}% of book`} tone={C.minor} />
            <Kpi label="Avg Break" value={`${L.avg_break_pct.toFixed(2)}%`} sub="across flagged records" />
            <Kpi label="Worst Break" value={`${L.worst_break_pct.toFixed(2)}%`} sub={`field · ${L.top_failing_field ?? "—"}`} tone={C.major} />
          </div>
        </section>

        {/* Trend + split */}
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <div>
            <Sect n="02" title="Match-Rate Trend" sub="Daily cross-venue agreement vs SLA threshold" />
            <Panel className="p-4 pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.trend} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.accent} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="trade_date" tick={{ fill: "var(--color-ink-mid)", fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(d) => String(d).slice(5)} stroke="var(--color-line)" />
                  <YAxis domain={[0.6, 1]} tick={{ fill: "var(--color-ink-mid)", fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="var(--color-line)" width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-ink-mid)" }} formatter={(v) => [pct(Number(v)), "match rate"]} />
                  <ReferenceLine y={data.threshold} stroke={C.major} strokeDasharray="4 4" strokeOpacity={0.6} />
                  <Area type="monotone" dataKey="match_rate" stroke={C.accent} strokeWidth={2.2} fill="url(#g)" dot={{ r: 2.5, fill: C.accent }} activeDot={{ r: 4 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          <div>
            <Sect n="03" title="Outcome Split" sub="Latest session" />
            <Panel className="p-5">
              <div className="flex h-2.5 w-full rounded-full overflow-hidden mb-5">
                {dist.map((d) => (
                  <div key={d.label} style={{ width: `${(d.v / total) * 100}%`, background: d.c }} title={`${d.label}: ${d.v}`} />
                ))}
              </div>
              <div className="space-y-3">
                {dist.map((d) => (
                  <div key={d.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: d.c }} />
                      <span className="text-[12px] text-[var(--color-ink-mid)]">{d.label}</span>
                    </div>
                    <div className="font-mono tabular text-[13px] font-medium" style={{ color: d.c }}>
                      {num(d.v)} <span className="text-[var(--color-ink-faint)] font-normal">{((d.v / total) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-[var(--color-line-soft)] space-y-2">
                {data.check_split.map((cs) => (
                  <div key={cs.check_type} className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[var(--color-ink-faint)]">{cs.check_type}</span>
                    <span className="text-[var(--color-ink-mid)]">
                      <span style={{ color: C.match }}>{cs.match}</span> / <span style={{ color: C.minor }}>{cs.minor}</span> / <span style={{ color: C.major }}>{cs.major}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        {/* Coverage + score distribution */}
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <Sect n="04" title="Source Coverage" sub="Overlap between the two exchange universes" />
            <Panel className="p-5">
              <div className="space-y-3.5">
                {coverage.map((c) => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-52 shrink-0 text-[12px] text-[var(--color-ink-mid)]">{c.label}</div>
                    <div className="flex-1 h-6 bg-[var(--color-panel-2)] rounded-md overflow-hidden">
                      <div className="h-full rounded-md transition-all" style={{ width: `${(c.v / universeMax) * 100}%`, background: c.c }} />
                    </div>
                    <div className="w-16 text-right font-mono tabular text-[12px] font-medium text-[var(--color-ink)]">{num(c.v)}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 pt-4 border-t border-[var(--color-line-soft)] text-[11px] text-[var(--color-ink-mid)] leading-relaxed">
                Only the <b className="text-[var(--color-ink)]">{num(L.dual_listed)}</b> dual-listed
                securities can be price-reconciled. The {num(L.bse_only)} BSE-only names are mostly
                illiquid small-caps not traded on NSE.
              </p>
            </Panel>
          </div>

          <div>
            <Sect n="05" title="Mismatch-Score Distribution" sub="Cross-venue records bucketed 0 → 100" />
            <Panel className="p-4 pt-6">
              <ResponsiveContainer width="100%" height={228}>
                <BarChart data={data.score_buckets} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: "var(--color-ink-mid)", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="var(--color-line)" />
                  <YAxis tick={{ fill: "var(--color-ink-mid)", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="var(--color-line)" width={44} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(47,95,255,0.05)" }} formatter={(v) => [num(Number(v)), "records"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {data.score_buckets.map((_, i) => (
                      <Cell key={i} fill={BUCKET_COLOR[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        </section>

        {/* Top failing fields + quality */}
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <Sect n="06" title="Top Failing Fields" sub="Which compared fields drive the drift" />
            <Panel className="p-5">
              {data.top_failing_fields.length === 0 ? (
                <div className="text-[12px] text-[var(--color-ink-faint)]">No failures.</div>
              ) : (
                <div className="space-y-3">
                  {data.top_failing_fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-44 shrink-0 text-[12px]">
                        <span className="font-mono text-[var(--color-ink)]">{f.field}</span>
                        <span className="text-[var(--color-ink-faint)] ml-2">{f.check_type}</span>
                      </div>
                      <div className="flex-1 h-5 bg-[var(--color-panel-2)] rounded-sm overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${(f.count / maxField) * 100}%`, background: "linear-gradient(90deg,#2f5fff,#7aa0ff)" }} />
                      </div>
                      <div className="w-12 text-right font-mono tabular text-[12px] text-[var(--color-ink-mid)]">{num(f.count)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Sect n="07" title="Data-Quality Checks" sub="Field-level cleansing rules at ingestion" />
            <Panel className="p-5">
              {data.quality_by_rule.length === 0 ? (
                <div className="flex items-center gap-3 py-6">
                  <div className="h-10 w-10 rounded-full grid place-items-center text-white text-lg" style={{ background: C.match }}>✓</div>
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--color-ink)]">All rows passed integrity checks</div>
                    <div className="text-[11px] text-[var(--color-ink-mid)] mt-0.5">
                      OHLC bounds, non-null / positive close, deliverable ≤ traded volume — 0 violations
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.quality_by_rule.map((r, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[var(--color-line-soft)] pb-2 last:border-0">
                      <span className="font-mono text-[12px] text-[var(--color-ink)]">{r.rule}</span>
                      <span className="font-mono tabular text-[12px]" style={{ color: C.minor }}>{num(r.count)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-[var(--color-line-soft)] grid grid-cols-3 gap-3 text-center">
                {["null / non-positive close", "OHLC out of range", "deliverable > volume"].map((t) => (
                  <div key={t} className="text-[10px] text-[var(--color-ink-mid)] leading-tight">{t}</div>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        {/* Biggest breaks — the headline finding */}
        <section className="mb-10">
          <Sect n="08" title="Largest Reconciliation Breaks" sub="Where NSE and BSE disagree most on the closing price" />
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--color-panel-2)]">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                    <th className="px-4 py-2.5 font-medium">Security</th>
                    <th className="px-4 py-2.5 font-medium">ISIN</th>
                    <th className="px-4 py-2.5 font-medium text-right">NSE Close</th>
                    <th className="px-4 py-2.5 font-medium text-right">BSE Close</th>
                    <th className="px-4 py-2.5 font-medium text-right">Δ ₹</th>
                    <th className="px-4 py-2.5 font-medium text-right">Δ %</th>
                    <th className="px-4 py-2.5 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.biggest_breaks.slice(0, 12).map((b, i) => (
                    <tr key={i} className="border-t border-[var(--color-line-soft)] hover:bg-[var(--color-panel-2)] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-[12px] font-medium text-[var(--color-ink)]">{b.ticker}</div>
                        <div className="text-[11px] text-[var(--color-ink-mid)] truncate max-w-[220px]">{b.name ?? ""}</div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--color-ink-faint)]">{b.isin ?? "—"}</td>
                      <td className="px-4 py-2.5 font-mono tabular text-[12px] text-right text-[var(--color-ink-mid)]">{money(b.nse)}</td>
                      <td className="px-4 py-2.5 font-mono tabular text-[12px] text-right text-[var(--color-ink-mid)]">{money(b.bse)}</td>
                      <td className="px-4 py-2.5 font-mono tabular text-[12px] text-right text-[var(--color-ink)]">{money(b.diff_abs)}</td>
                      <td className="px-4 py-2.5 font-mono tabular text-[12px] text-right font-semibold" style={{ color: C.major }}>
                        {b.diff_pct == null ? "—" : `${b.diff_pct.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-2.5"><StatusPill status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        {/* Three-way source adjudication */}
        <section className="mb-10">
          <Sect
            n="09"
            title="Three-Way Source Adjudication"
            sub="Yahoo Finance as an independent third source — when two venues disagree, which one is the outlier?"
          />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Yahoo Rows Pulled" value={num(data.tri_source.summary.yahoo_rows)} sub="independent quotes" tone="#7c3aed" />
                <Kpi label="Breaks Confirmed" value={num(data.tri_source.summary.confirmed_breaks)} sub={`of ${num(data.tri_source.summary.adjudicated)} adjudicated`} tone={C.major} />
              </div>
              <Panel className="p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-faint)] mb-3">
                  Outlier source (who's wrong)
                </div>
                {data.tri_source.outlier_breakdown.length === 0 ? (
                  <div className="text-[12px] text-[var(--color-ink-faint)]">No confirmed breaks.</div>
                ) : (
                  <div className="space-y-3">
                    {data.tri_source.outlier_breakdown.map((o) => {
                      const maxO = Math.max(...data.tri_source.outlier_breakdown.map((x) => x.count), 1);
                      return (
                        <div key={o.source} className="flex items-center gap-3">
                          <span className="w-14 font-mono text-[12px] font-medium" style={{ color: SOURCE_COLOR[o.source] ?? C.accent }}>
                            {o.source}
                          </span>
                          <div className="flex-1 h-5 bg-[var(--color-panel-2)] rounded-sm overflow-hidden">
                            <div className="h-full rounded-sm" style={{ width: `${(o.count / maxO) * 100}%`, background: SOURCE_COLOR[o.source] ?? C.accent }} />
                          </div>
                          <span className="w-10 text-right font-mono tabular text-[12px] text-[var(--color-ink-mid)]">{num(o.count)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="mt-4 pt-4 border-t border-[var(--color-line-soft)] text-[11px] text-[var(--color-ink-mid)] leading-relaxed">
                  Yahoo's Indian quotes align with NSE, corroborating NSE as the market-consensus
                  close. The breaks are BSE-side — typical for thinly-traded B-group scrips whose
                  last-traded price lags.
                </p>
              </Panel>
            </div>

            <Panel className="overflow-hidden">
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-[var(--color-panel-2)] z-[1]">
                    <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                      <th className="px-4 py-2.5 font-medium">Ticker</th>
                      <th className="px-4 py-2.5 font-medium text-right">NSE</th>
                      <th className="px-4 py-2.5 font-medium text-right">BSE</th>
                      <th className="px-4 py-2.5 font-medium text-right">Yahoo</th>
                      <th className="px-4 py-2.5 font-medium text-right">Spread %</th>
                      <th className="px-4 py-2.5 font-medium">Outlier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tri_source.rows.slice(0, triVisible).map((r, i) => (
                      <tr key={i} className="border-t border-[var(--color-line-soft)] hover:bg-[var(--color-panel-2)] transition-colors">
                        <td className="px-4 py-2 font-mono text-[12px] font-medium text-[var(--color-ink)]">{r.ticker}</td>
                        {(["nse", "bse", "yahoo"] as const).map((k) => {
                          const src = k.toUpperCase();
                          const isOut = r.outlier_source === src;
                          return (
                            <td
                              key={k}
                              className="px-4 py-2 font-mono tabular text-[12px] text-right"
                              style={{ color: isOut ? C.major : "var(--color-ink-mid)", fontWeight: isOut ? 600 : 400 }}
                            >
                              {money(r[k])}
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 font-mono tabular text-[12px] text-right font-semibold text-[var(--color-ink)]">
                          {r.spread_pct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                            style={{
                              color: SOURCE_COLOR[r.outlier_source ?? ""] ?? C.accent,
                              borderColor: `${SOURCE_COLOR[r.outlier_source ?? ""] ?? C.accent}40`,
                              background: `${SOURCE_COLOR[r.outlier_source ?? ""] ?? C.accent}10`,
                            }}
                          >
                            {r.outlier_source ?? "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.tri_source.rows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center font-mono text-[11px] text-[var(--color-ink-faint)]">
                          no tri-source adjudications in this run
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {triVisible < data.tri_source.rows.length && (
                <div className="px-4 py-2.5 border-t border-[var(--color-line)] flex items-center justify-between font-mono text-[10px] text-[var(--color-ink-faint)]">
                  <span>showing {Math.min(triVisible, data.tri_source.rows.length)} of {data.tri_source.rows.length} adjudicated</span>
                  <button
                    onClick={() => setTriVisible((v) => v + 12)}
                    className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border border-[var(--color-line)] text-[var(--color-accent)] hover:bg-[var(--color-panel-2)] transition-colors"
                  >
                    LOAD MORE
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </section>

        {/* Drill-down queue */}
        <section className="mb-12">
          <Sect
            n="10"
            title="Analyst Drill-Down Queue"
            sub="Every flagged record, worst-scored first — the work list"
            right={
              <div className="flex items-center gap-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="filter ticker…"
                  className="bg-white border border-[var(--color-line)] rounded-lg px-3 py-1.5 font-mono text-[11px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15 w-36 transition"
                />
                <div className="flex rounded-lg border border-[var(--color-line)] overflow-hidden">
                  {(["ALL", "MAJOR", "MINOR"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className="font-mono text-[10px] font-semibold px-3 py-1.5 transition-colors"
                      style={{
                        background: filter === f ? (f === "ALL" ? "var(--color-ink)" : STATUS_COLOR[f]) : "#fff",
                        color: filter === f ? "#fff" : "var(--color-ink-mid)",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[var(--color-panel-2)] z-[1]">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                    <th className="px-4 py-2.5 font-medium">Ticker</th>
                    <th className="px-4 py-2.5 font-medium">Check</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium text-right">Value A</th>
                    <th className="px-4 py-2.5 font-medium text-right">Value B</th>
                    <th className="px-4 py-2.5 font-medium text-right">Δ %</th>
                    <th className="px-4 py-2.5 font-medium text-right">Score</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.slice(0, visible).map((r, i) => (
                    <tr key={i} className="border-t border-[var(--color-line-soft)] hover:bg-[var(--color-panel-2)] transition-colors">
                      <td className="px-4 py-2 font-mono text-[12px] font-medium text-[var(--color-ink)]">{r.ticker}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--color-ink-faint)]">{r.check_type}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-[var(--color-ink-mid)]">{r.trade_date}</td>
                      <td className="px-4 py-2 font-mono tabular text-[12px] text-right text-[var(--color-ink-mid)]">{money(r.value_a)}</td>
                      <td className="px-4 py-2 font-mono tabular text-[12px] text-right text-[var(--color-ink-mid)]">{money(r.value_b)}</td>
                      <td className="px-4 py-2 font-mono tabular text-[12px] text-right text-[var(--color-ink)]">{r.diff_pct == null ? "—" : `${r.diff_pct.toFixed(2)}%`}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="font-mono tabular text-[12px] font-semibold" style={{ color: STATUS_COLOR[r.status] }}>{r.mismatch_score.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                      <td className="px-4 py-2 text-[11px] text-[var(--color-ink-mid)] max-w-[220px] truncate">{r.explanation ?? ""}</td>
                    </tr>
                  ))}
                  {queue.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center font-mono text-[11px] text-[var(--color-ink-faint)]">
                        no records match this filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--color-line)] font-mono text-[10px] text-[var(--color-ink-faint)] flex items-center justify-between">
              <span>
                showing {Math.min(visible, queue.length)} of {queue.length} filtered
                {queue.length !== data.queue.length ? ` · ${data.queue.length} total flagged` : ""}
              </span>
              <div className="flex items-center gap-4">
                {visible < queue.length && (
                  <button
                    onClick={() => setVisible((v) => v + 25)}
                    className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border border-[var(--color-line)] text-[var(--color-accent)] hover:bg-[var(--color-panel-2)] transition-colors"
                  >
                    LOAD 25 MORE
                  </button>
                )}
                <span>mismatch score 0 → 100</span>
              </div>
            </div>
          </Panel>
        </section>

        <footer className="border-t border-[var(--color-line)] pt-5 pb-10 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-[var(--color-ink-mid)]">
          <span>Sources: NSE full bhavcopy · BSE cash bhavcopy · Yahoo Finance (adjudication) · corporate actions (enrichment)</span>
          <span>Python ETL · SQL (SQLite/Postgres) · reconciliation engine · scheduled via GitHub Actions</span>
        </footer>
      </main>
    </div>
  );
}
