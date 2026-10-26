export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

const RATING: Record<string, string> = {
  weak: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  strong: "bg-green-100 text-green-700",
};

export function RatingBadge({ rating }: { rating: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${RATING[rating] ?? ""}`}>
      {rating}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
    </div>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
