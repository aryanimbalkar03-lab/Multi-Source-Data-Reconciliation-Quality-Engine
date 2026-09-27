import { useState, useMemo } from "react";
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
import { reconSummary } from "./data/reconSummary";
import { amfiNavs, amfiCategories, amfiAMCs } from "./data/amfiNavs";
import { nifty50Constituents, niftyBankConstituents } from "./data/nseIndexConstituents";

// ─── Color tokens ───
const C = {
  match: "#0f9d63",
  minor: "#b7791f",
  major: "#d92d20",
  accent: "#2f5fff",
  purple: "#7c3aed",
};
const STATUS_COLOR: Record<string, string> = { MATCH: C.match, MINOR: C.minor, MAJOR: C.major };
const BUCKET_COLOR = ["#0f9d63", "#4bad78", "#b7791f", "#e08a2e", "#d92d20"];
const SOURCE_COLOR: Record<string, string> = { NSE: "#2f5fff", BSE: "#d92d20", YAHOO: "#7c3aed" };

// ─── Helpers ───
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const num = (n: number) => n.toLocaleString("en-IN");
const money = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const crToLakhCr = (cr: number) => `₹${(cr / 100000).toFixed(2)}L Cr`;

// ─── Shared Components ───
function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Panel className="p-5 flex flex-col justify-between min-h-[116px] hover:shadow-md transition-shadow">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">{label}</div>
      <div>
        <div className="font-mono text-[28px] leading-none font-bold" style={{ color: tone ?? "#1a1d26" }}>
          {value}
        </div>
        {sub && <div className="mt-2 text-[11px] text-gray-500">{sub}</div>}
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

function Sect({ n, title, sub, right }: { n: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-blue-600 font-semibold">{n}</span>
        <div>
          <h2 className="text-[16px] font-bold tracking-tight text-gray-900">{title}</h2>
          {sub && <p className="text-[12px] text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  boxShadow: "0 6px 24px rgba(16,19,26,0.10)",
};

// ─── Tab Types ───
type TabId = "overview" | "amfi" | "nse" | "queue";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Masthead */}
      <header className="border-b border-gray-200 sticky top-0 z-20 bg-white/90 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-lg grid place-items-center font-bold text-white text-lg" style={{ background: "linear-gradient(135deg,#2f5fff,#5b82ff)" }}>
              R
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight leading-tight text-gray-900">
                Multi-Source Data Reconciliation & Quality Engine
              </div>
              <div className="text-[11px] text-gray-500">
                NSE ⋈ BSE ⋈ AMFI ⋈ Yahoo · Indian Capital Markets · Cross-venue data integrity
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">Session</span>
              <span className="font-mono text-[12px] font-medium text-gray-900">{reconSummary.latest.trade_date}</span>
            </div>
            <div
              className="flex items-center gap-2 font-mono text-[11px] font-semibold px-3 py-1.5 rounded-lg border"
              style={{ color: C.match, borderColor: "#0f9d6340", background: "#0f9d6310" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.match }} />
              WITHIN SLA
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-[1360px] mx-auto px-6">
          <nav className="flex gap-1">
            {([
              { id: "overview", label: "Reconciliation Overview" },
              { id: "amfi", label: "AMFI Mutual Fund NAVs" },
              { id: "nse", label: "NSE Index Constituents" },
              { id: "queue", label: "Analyst Queue" },
            ] as { id: TabId; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1360px] mx-auto px-6 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "amfi" && <AmfiTab />}
        {activeTab === "nse" && <NseTab />}
        {activeTab === "queue" && <QueueTab />}
      </main>

      <footer className="border-t border-gray-200 pt-5 pb-10 max-w-[1360px] mx-auto px-6 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-gray-500">
        <span>Sources: NSE Bhavcopy · BSE Cash Bhavcopy · AMFI India · Yahoo Finance · Corporate Actions</span>
        <span>Python ETL · SQL · Reconciliation Engine · Scheduled via GitHub Actions</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════
function OverviewTab() {
  const data = reconSummary;
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
    <>
      {/* Rollup strip */}
      <div className="border border-gray-200 bg-gray-50 rounded-lg px-5 py-2.5 flex flex-wrap gap-x-8 gap-y-1 font-mono text-[11px] text-gray-500 mb-8">
        <span>sessions reconciled <b className="text-gray-900">{data.totals.runs}</b></span>
        <span>records compared <b className="text-gray-900">{num(data.totals.total_compared)}</b></span>
        <span>avg match rate <b className="text-gray-900">{data.totals.avg_match_rate != null ? pct(data.totals.avg_match_rate) : "—"}</b></span>
        <span>total major breaks <b style={{ color: C.major }}>{num(data.totals.total_major)}</b></span>
        <span>AMFI funds tracked <b className="text-gray-900">{L.amfi_funds_tracked}</b></span>
        <span>NIFTY 50 constituents <b className="text-gray-900">{L.nifty50_constituents}</b></span>
        <span className="ml-auto text-gray-400">generated {new Date(data.generated_at).toLocaleString("en-IN")}</span>
      </div>

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
                <CartesianGrid stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="trade_date" tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(d) => String(d).slice(5)} stroke="#e5e7eb" />
                <YAxis domain={[0.94, 1]} tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} stroke="#e5e7eb" width={40} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [pct(Number(v)), "match rate"]} />
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
                    <span className="text-[12px] text-gray-500">{d.label}</span>
                  </div>
                  <div className="font-mono text-[13px] font-medium" style={{ color: d.c }}>
                    {num(d.v)} <span className="text-gray-400 font-normal">{((d.v / total) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
              {data.check_split.map((cs) => (
                <div key={cs.check_type} className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-gray-400">{cs.check_type}</span>
                  <span className="text-gray-500">
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
          <Sect n="04" title="Source Coverage" sub="Overlap between exchange universes" />
          <Panel className="p-5">
            <div className="space-y-3.5">
              {coverage.map((c) => (
                <div key={c.label} className="flex items-center gap-4">
                  <div className="w-52 shrink-0 text-[12px] text-gray-500">{c.label}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full rounded-md transition-all" style={{ width: `${(c.v / universeMax) * 100}%`, background: c.c }} />
                  </div>
                  <div className="w-16 text-right font-mono text-[12px] font-medium text-gray-900">{num(c.v)}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
              Only the <b className="text-gray-900">{num(L.dual_listed)}</b> dual-listed securities can be price-reconciled. The {num(L.bse_only)} BSE-only names are mostly illiquid small-caps not traded on NSE.
              AMFI tracks <b className="text-gray-900">{L.amfi_funds_tracked}</b> mutual fund NAVs for cross-validation against underlying index movements.
            </p>
          </Panel>
        </div>

        <div>
          <Sect n="05" title="Mismatch-Score Distribution" sub="Cross-venue records bucketed 0 → 100" />
          <Panel className="p-4 pt-6">
            <ResponsiveContainer width="100%" height={228}>
              <BarChart data={data.score_buckets} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" width={44} />
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
            <div className="space-y-3">
              {data.top_failing_fields.map((f, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-44 shrink-0 text-[12px]">
                    <span className="font-mono text-gray-900">{f.field}</span>
                    <span className="text-gray-400 ml-2">{f.check_type}</span>
                  </div>
                  <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                    <div className="h-full rounded-sm" style={{ width: `${(f.count / maxField) * 100}%`, background: "linear-gradient(90deg,#2f5fff,#7aa0ff)" }} />
                  </div>
                  <div className="w-12 text-right font-mono text-[12px] text-gray-500">{num(f.count)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div>
          <Sect n="07" title="Data-Quality Checks" sub="Field-level cleansing rules at ingestion" />
          <Panel className="p-5">
            <div className="space-y-2.5">
              {data.quality_by_rule.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <span className="font-mono text-[12px] text-gray-900">{r.rule}</span>
                  <span className="font-mono text-[12px]" style={{ color: C.minor }}>{num(r.count)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
              Quality checks run on all 2,847 dual-listed records at ingestion. OHLC bounds ensure high/low bracket open/close. Non-null close ensures no missing prices. Deliverable ≤ volume prevents data errors.
            </div>
          </Panel>
        </div>
      </section>

      {/* Biggest breaks */}
      <section className="mb-10">
        <Sect n="08" title="Largest Reconciliation Breaks" sub="Where NSE and BSE disagree most on the closing price" />
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
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
                {data.biggest_breaks.map((b, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-[12px] font-medium text-gray-900">{b.ticker}</div>
                      <div className="text-[11px] text-gray-500 truncate max-w-[220px]">{b.name ?? ""}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{b.isin ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-right text-gray-500">{money(b.nse)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-right text-gray-500">{money(b.bse)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-right text-gray-900">{money(b.diff_abs)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-right font-semibold" style={{ color: C.major }}>
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
        <Sect n="09" title="Three-Way Source Adjudication" sub="Yahoo Finance as independent third source — when two venues disagree, which one is the outlier?" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Yahoo Rows" value={num(data.tri_source.summary.yahoo_rows)} sub="independent quotes" tone="#7c3aed" />
              <Kpi label="Confirmed Breaks" value={num(data.tri_source.summary.confirmed_breaks)} sub={`of ${num(data.tri_source.summary.adjudicated)} adjudicated`} tone={C.major} />
            </div>
            <Panel className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 mb-3">Outlier source (who's wrong)</div>
              <div className="space-y-3">
                {data.tri_source.outlier_breakdown.map((o) => {
                  const maxO = Math.max(...data.tri_source.outlier_breakdown.map((x) => x.count), 1);
                  return (
                    <div key={o.source} className="flex items-center gap-3">
                      <span className="w-14 font-mono text-[12px] font-medium" style={{ color: SOURCE_COLOR[o.source] ?? C.accent }}>{o.source}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-sm overflow-hidden">
                        <div className="h-full rounded-sm" style={{ width: `${(o.count / maxO) * 100}%`, background: SOURCE_COLOR[o.source] ?? C.accent }} />
                      </div>
                      <span className="w-10 text-right font-mono text-[12px] text-gray-500">{num(o.count)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
                Yahoo's Indian quotes align with NSE, corroborating NSE as the market-consensus close. Most breaks are BSE-side — typical for thinly-traded scrips whose last-traded price lags behind NSE's more liquid closing auction.
              </p>
            </Panel>
          </div>

          <Panel className="overflow-hidden">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-gray-50 z-[1]">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                    <th className="px-4 py-2.5 font-medium">Ticker</th>
                    <th className="px-4 py-2.5 font-medium text-right">NSE</th>
                    <th className="px-4 py-2.5 font-medium text-right">BSE</th>
                    <th className="px-4 py-2.5 font-medium text-right">Yahoo</th>
                    <th className="px-4 py-2.5 font-medium text-right">Spread %</th>
                    <th className="px-4 py-2.5 font-medium">Outlier</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tri_source.rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 font-mono text-[12px] font-medium text-gray-900">{r.ticker}</td>
                      {(["nse", "bse", "yahoo"] as const).map((k) => {
                        const src = k.toUpperCase();
                        const isOut = r.outlier_source === src;
                        return (
                          <td key={k} className="px-4 py-2 font-mono text-[12px] text-right" style={{ color: isOut ? C.major : "#6b7280", fontWeight: isOut ? 600 : 400 }}>
                            {money(r[k])}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 font-mono text-[12px] text-right font-semibold text-gray-900">{r.spread_pct.toFixed(2)}%</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border" style={{
                          color: SOURCE_COLOR[r.outlier_source ?? ""] ?? "#6b7280",
                          borderColor: `${SOURCE_COLOR[r.outlier_source ?? ""] ?? "#6b7280"}40`,
                          background: `${SOURCE_COLOR[r.outlier_source ?? ""] ?? "#6b7280"}10`,
                        }}>
                          {r.outlier_source ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2: AMFI MUTUAL FUND NAVs
// ═══════════════════════════════════════════════════════
function AmfiTab() {
  const [catFilter, setCatFilter] = useState("All");
  const [amcFilter, setAmcFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return amfiNavs.filter((f) => {
      if (catFilter !== "All" && f.category !== catFilter) return false;
      if (amcFilter !== "All" && f.amc !== amcFilter) return false;
      if (search && !f.scheme_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [catFilter, amcFilter, search]);

  return (
    <>
      <Sect n="AMFI" title="AMFI Mutual Fund NAVs" sub="Real NAV data sourced from AMFI India (Association of Mutual Funds in India) — the official industry body" />

      {/* Info banner */}
      <Panel className="p-4 mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-blue-600 text-lg">ℹ️</span>
          <div className="text-[12px] text-blue-800 leading-relaxed">
            <b>About this data:</b> AMFI publishes daily NAVs for all registered mutual fund schemes in India. NAVs are computed post-market close (typically 9-10 PM IST) based on closing prices of underlying securities.
            The reconciliation engine cross-validates fund NAVs against the underlying index movements and constituent prices to detect stale pricing or computation errors.
            Categories include Large Cap, Flexi Cap, ELSS (tax-saving), Mid Cap, Small Cap, Debt, Hybrid, Index, International, and Gold ETF.
          </div>
        </div>
      </Panel>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="All">All Categories</option>
          {amfiCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={amcFilter} onChange={(e) => setAmcFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="All">All AMCs</option>
          {amfiAMCs.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scheme name..."
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
        />
        <span className="self-center font-mono text-[11px] text-gray-400">{filtered.length} schemes</span>
      </div>

      {/* NAV Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-[1]">
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2.5 font-medium">Scheme Name</th>
                <th className="px-4 py-2.5 font-medium">AMC</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">ISIN</th>
                <th className="px-4 py-2.5 font-medium text-right">NAV (₹)</th>
                <th className="px-4 py-2.5 font-medium">NAV Date</th>
                <th className="px-4 py-2.5 font-medium">RTA</th>
                <th className="px-4 py-2.5 font-medium min-w-[320px]">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[12px] font-medium text-gray-900 max-w-[280px]">{f.scheme_name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{f.scheme_type}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-600">{f.amc}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 bg-blue-50">
                      {f.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{f.isin}</td>
                  <td className="px-4 py-3 font-mono text-[13px] font-semibold text-gray-900 text-right">{money(f.nav)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{f.nav_date}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{f.rta}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-600 leading-relaxed max-w-[400px]">{f.note}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-mono text-[11px] text-gray-400">No schemes match the current filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* NAV Distribution Chart */}
      <div className="mt-8">
        <Sect n="AMFI-02" title="NAV Distribution by Category" sub="Visualizing the range of NAVs across fund categories" />
        <Panel className="p-4 pt-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={amfiCategories.map(cat => ({
              category: cat,
              avg_nav: amfiNavs.filter(f => f.category === cat).reduce((sum, f) => sum + f.nav, 0) / amfiNavs.filter(f => f.category === cat).length,
              count: amfiNavs.filter(f => f.category === cat).length,
            }))} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" width={50} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [name === "avg_nav" ? `₹${Number(v).toFixed(2)}` : v, name === "avg_nav" ? "Avg NAV" : "Count"]} />
              <Bar dataKey="avg_nav" fill="#2f5fff" radius={[4, 4, 0, 0]} isAnimationActive={false} name="avg_nav" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
            Higher average NAVs in categories like ELSS and Flexi Cap reflect longer track records and compounding. Index funds have moderate NAVs tracking their benchmarks.
            Gold ETF NAVs track domestic gold prices. Debt fund NAVs are lower due to shorter duration and lower return expectations.
          </p>
        </Panel>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 3: NSE INDEX CONSTITUENTS
// ═══════════════════════════════════════════════════════
function NseTab() {
  const [indexFilter, setIndexFilter] = useState<"NIFTY 50" | "NIFTY BANK">("NIFTY 50");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [search, setSearch] = useState("");

  const constituents = indexFilter === "NIFTY 50" ? nifty50Constituents : niftyBankConstituents;
  const sectors = [...new Set(constituents.map(c => c.sector))];

  const filtered = useMemo(() => {
    return constituents.filter((c) => {
      if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
      if (search && !c.symbol.toLowerCase().includes(search.toLowerCase()) && !c.company_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [constituents, sectorFilter, search]);

  const totalWeight = filtered.reduce((s, c) => s + c.weight_in_index, 0);
  const totalMcap = filtered.reduce((s, c) => s + c.market_cap_cr, 0);

  return (
    <>
      <Sect n="NSE" title="NSE Index Constituents" sub="Real constituent data for NIFTY 50 and NIFTY BANK indices from NSE India" />

      {/* Info banner */}
      <Panel className="p-4 mb-6 bg-green-50 border-green-200">
        <div className="flex items-start gap-3">
          <span className="text-green-600 text-lg">📊</span>
          <div className="text-[12px] text-green-800 leading-relaxed">
            <b>About this data:</b> NSE indices are computed using free-float market capitalization methodology. Each constituent's weight is determined by its free-float market cap relative to the index total.
            Rebalancing happens semi-annually (January & July). The reconciliation engine validates constituent data against exchange feeds, ensuring ISIN mappings, sector classifications, and weight calculations are accurate.
            NIFTY 50 represents top 50 companies across sectors. NIFTY BANK tracks the banking sector (12 constituents).
          </div>
        </div>
      </Panel>

      {/* Index selector + filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["NIFTY 50", "NIFTY BANK"] as const).map((idx) => (
            <button
              key={idx}
              onClick={() => { setIndexFilter(idx); setSectorFilter("All"); }}
              className={`px-4 py-2 text-[12px] font-medium transition-colors ${
                indexFilter === idx ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {idx}
            </button>
          ))}
        </div>
        <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="All">All Sectors</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbol or company..."
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-56"
        />
        <span className="font-mono text-[11px] text-gray-400">{filtered.length} constituents · Weight: {totalWeight.toFixed(1)}% · mCap: {crToLakhCr(totalMcap)}</span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Constituents" value={String(filtered.length)} sub={indexFilter} />
        <Kpi label="Total Free-Float mCap" value={crToLakhCr(totalMcap)} sub="combined market cap" />
        <Kpi label="Total Weight" value={`${totalWeight.toFixed(1)}%`} sub="of index" />
        <Kpi label="Top Constituent" value={filtered.length > 0 ? filtered.sort((a, b) => b.weight_in_index - a.weight_in_index)[0].symbol : "—"} sub={filtered.length > 0 ? `${filtered[0].weight_in_index.toFixed(1)}% weight` : ""} />
      </div>

      {/* Constituents Table */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-[1]">
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-4 py-2.5 font-medium">Company</th>
                <th className="px-4 py-2.5 font-medium">Sector</th>
                <th className="px-4 py-2.5 font-medium">ISIN</th>
                <th className="px-4 py-2.5 font-medium text-right">Market Cap</th>
                <th className="px-4 py-2.5 font-medium text-right">FF Factor</th>
                <th className="px-4 py-2.5 font-medium text-right">Weight %</th>
                <th className="px-4 py-2.5 font-medium min-w-[340px]">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.weight_in_index - a.weight_in_index).map((c, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] font-bold text-blue-600">{c.symbol}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[200px]">{c.company_name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{c.sector}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{c.isin}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right text-gray-700">{crToLakhCr(c.market_cap_cr)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right text-gray-500">{(c.free_float_factor * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right font-semibold text-gray-900">{c.weight_in_index.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-[11px] text-gray-600 leading-relaxed max-w-[400px]">{c.note}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-mono text-[11px] text-gray-400">No constituents match the current filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Weight distribution chart */}
      <div className="mt-8">
        <Sect n="NSE-02" title="Index Weight Distribution" sub={`Top 15 constituents by weight in ${indexFilter}`} />
        <Panel className="p-4 pt-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={[...constituents].sort((a, b) => b.weight_in_index - a.weight_in_index).slice(0, 15).map(c => ({
                symbol: c.symbol,
                weight: c.weight_in_index,
              }))}
              margin={{ top: 4, right: 12, left: -8, bottom: 0 }}
            >
              <CartesianGrid stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="symbol" tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" angle={-35} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="#e5e7eb" width={40} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${Number(v).toFixed(2)}%`, "Index Weight"]} />
              <Bar dataKey="weight" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {[...constituents].sort((a, b) => b.weight_in_index - a.weight_in_index).slice(0, 15).map((c, i) => (
                  <Cell key={i} fill={i < 3 ? "#2f5fff" : i < 7 ? "#5b82ff" : "#7aa0ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
            {indexFilter === "NIFTY 50"
              ? "HDFC Bank, Reliance, and TCS together account for ~25% of the index. Financial services is the heaviest sector at ~30% weight. The top 10 stocks contribute ~55% of total index weight, indicating moderate concentration."
              : "NIFTY BANK is heavily concentrated with HDFC Bank (~28%) and ICICI Bank (~22%) together accounting for 50% of the index. This concentration risk means the index performance is heavily driven by these two stocks. PSU banks have lower weights due to government holding limits."}
          </p>
        </Panel>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 4: ANALYST QUEUE
// ═══════════════════════════════════════════════════════
function QueueTab() {
  const [filter, setFilter] = useState<"ALL" | "MAJOR" | "MINOR">("ALL");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(25);

  const queue = useMemo(() => {
    return reconSummary.queue
      .filter((r) => (filter === "ALL" ? true : r.status === filter))
      .filter((r) => (q ? r.ticker.toLowerCase().includes(q.toLowerCase()) || (r.explanation ?? "").toLowerCase().includes(q.toLowerCase()) : true));
  }, [filter, q]);

  return (
    <>
      <Sect
        n="QUEUE"
        title="Analyst Drill-Down Queue"
        sub="Every flagged record, worst-scored first — the work list for data stewards"
        right={
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="filter ticker or note..."
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-mono text-[11px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 w-44 transition"
            />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["ALL", "MAJOR", "MINOR"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="font-mono text-[10px] font-semibold px-3 py-1.5 transition-colors"
                  style={{
                    background: filter === f ? (f === "ALL" ? "#1a1d26" : STATUS_COLOR[f]) : "#fff",
                    color: filter === f ? "#fff" : "#6b7280",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Info banner */}
      <Panel className="p-4 mb-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <span className="text-amber-600 text-lg">🔍</span>
          <div className="text-[12px] text-amber-800 leading-relaxed">
            <b>How to read this queue:</b> Each row represents a data discrepancy detected between NSE and BSE. The <b>mismatch score</b> (0-100) quantifies severity — higher means more concerning.
            The <b>Note</b> column provides analyst-friendly context: why the break occurred, whether it's a real error or a structural difference (e.g., liquidity, circuit filters, settlement timing).
            MAJOR breaks (&gt;2% difference) require investigation. MINOR breaks (&lt;2%) are typically within tolerance and resolve on their own.
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-[1]">
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-gray-400">
                <th className="px-4 py-2.5 font-medium">Ticker</th>
                <th className="px-4 py-2.5 font-medium">Check</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium text-right">Value A (NSE)</th>
                <th className="px-4 py-2.5 font-medium text-right">Value B (BSE)</th>
                <th className="px-4 py-2.5 font-medium text-right">Δ %</th>
                <th className="px-4 py-2.5 font-medium text-right">Score</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium min-w-[380px]">Note</th>
              </tr>
            </thead>
            <tbody>
              {queue.slice(0, visible).map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] font-medium text-gray-900">{r.ticker}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{r.check_type}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{r.trade_date}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right text-gray-500">{money(r.value_a)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right text-gray-500">{money(r.value_b)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-right text-gray-900">{r.diff_pct == null ? "—" : `${r.diff_pct.toFixed(2)}%`}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-[12px] font-semibold" style={{ color: STATUS_COLOR[r.status] }}>{r.mismatch_score.toFixed(0)}</span>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3 text-[11px] text-gray-600 leading-relaxed max-w-[420px]">{r.explanation ?? ""}</td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center font-mono text-[11px] text-gray-400">
                    no records match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-gray-200 font-mono text-[10px] text-gray-400 flex items-center justify-between">
          <span>
            showing {Math.min(visible, queue.length)} of {queue.length} filtered
            {queue.length !== reconSummary.queue.length ? ` · ${reconSummary.queue.length} total flagged` : ""}
          </span>
          <div className="flex items-center gap-4">
            {visible < queue.length && (
              <button
                onClick={() => setVisible((v) => v + 25)}
                className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded border border-gray-200 text-blue-600 hover:bg-gray-50 transition-colors"
              >
                LOAD 25 MORE
              </button>
            )}
            <span>mismatch score 0 → 100</span>
          </div>
        </div>
      </Panel>
    </>
  );
}
