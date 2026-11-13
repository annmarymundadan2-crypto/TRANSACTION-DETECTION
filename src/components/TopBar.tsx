import { RotateCcw, Shield } from 'lucide-react';

interface TopBarProps {
  onResetDefaults: () => void;
}

export function TopBar({ onResetDefaults }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Single-element brand wordmark */}
        <a
          href="#analyzer"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>UPI Sentinel</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"
        >
          <a
            href="#analyzer"
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8"
          >
            Transaction Analyzer
          </a>
          <a
            href="#model-accuracy"
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8"
          >
            Model Accuracy
          </a>
          <a
            href="#evaluation-log"
            className="shrink-0 whitespace-nowrap transition-colors hover:text-slate-950 hover:underline hover:underline-offset-8"
          >
            Evaluation Log
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>
    </header>
  );
}
