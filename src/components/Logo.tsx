import { Target } from "lucide-react";

export default function Logo({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-bold tracking-tight ${onDark ? "text-white" : "text-slate-900"} ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
        <Target size={18} />
      </span>
      <span>GapFinder<span className={onDark ? "text-indigo-200" : "text-indigo-600"}> AI</span></span>
    </span>
  );
}
