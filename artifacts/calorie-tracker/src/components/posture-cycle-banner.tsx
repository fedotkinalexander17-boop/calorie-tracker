import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, Download, BrainCircuit, Loader2,
  CheckCircle2, RefreshCw, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { useT } from "@/lib/i18n";

interface CycleStatus {
  phase: "normal" | "warning" | "day31" | "expired";
  dayCount: number;
  daysLeft: number;
  hasSheet: boolean;
  sheetUrl: string | null;
}

interface AnalysisResult {
  trend: string;
  trendScore: number;
  summary: string;
  achievements: string[];
  problemZones: string[];
  nextCycleGoals: string[];
  recommendations: string[];
}

export function PostureCycleBanner() {
  const { t, lang } = useT();
  const cb = t.cycleBanner;

  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const fetchStatus = () => {
    fetch("/api/sheets/posture-cycle-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data: CycleStatus) => setStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    window.addEventListener("posture-cycle-reset", fetchStatus);
    return () => window.removeEventListener("posture-cycle-reset", fetchStatus);
  }, []);

  if (!status || !status.hasSheet || dismissed) return null;
  if (status.phase === "normal") return null;

  const isWarning = status.phase === "warning";
  const isDay31 = status.phase === "day31";
  const isExpired = status.phase === "expired";

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/sheets/download-posture", { credentials: "include" });
      if (!res.ok) throw new Error("Ошибка скачивания");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "osanka.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDownloading(false);
    }
  };

  const analyzeWithAI = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/sheets/analyze-posture-data", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Ошибка анализа");
      }
      const data = (await res.json()) as { analysis: AnalysisResult; sessionCount: number };
      setAnalysis(data.analysis);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка анализа");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetCycle = async () => {
    if (!window.confirm(lang === "ru"
      ? "Начать новый цикл? Старая таблица останется в Google Drive, но приложение начнёт новую."
      : "Start a new cycle? The old sheet will remain in Google Drive, but the app will start a new one.")) return;
    setResetting(true);
    try {
      await fetch("/api/sheets/posture-reset", { method: "POST", credentials: "include" });
      setResetDone(true);
      setStatus(null);
    } catch {
      alert("Ошибка сброса");
    } finally {
      setResetting(false);
    }
  };

  const trendColor = (score: number) =>
    score > 1 ? "text-green-700" : score < -1 ? "text-red-700" : "text-yellow-700";

  const trendArrow = (score: number) =>
    score > 1 ? "↑" : score < -1 ? "↓" : "→";

  if (resetDone) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
        <span className="text-green-800 font-medium">{cb.resetDone}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-3 ${
      isExpired || isDay31
        ? "bg-red-50 border-red-200"
        : "bg-amber-50 border-amber-200"
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
          isExpired || isDay31 ? "text-red-500" : "text-amber-500"
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isExpired || isDay31 ? "text-red-800" : "text-amber-800"}`}>
            {isExpired
              ? cb.expiredTitle
              : isDay31
              ? cb.day31Title
              : cb.warningTitle(status.daysLeft)}
          </p>
          <p className={`text-xs mt-0.5 ${isExpired || isDay31 ? "text-red-700" : "text-amber-700"}`}>
            {isExpired
              ? cb.expiredDesc
              : isDay31
              ? cb.day31Desc
              : cb.warningDesc}
          </p>
        </div>
        {isWarning && (
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Day counter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isExpired || isDay31 ? "bg-red-500" : "bg-amber-400"
            }`}
            style={{ width: `${Math.min(100, (status.dayCount / 31) * 100)}%` }}
          />
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${isExpired || isDay31 ? "text-red-700" : "text-amber-700"}`}>
          {cb.dayOf(status.dayCount, 30)}
        </span>
      </div>

      {/* Action buttons — day 31 and expired */}
      {(isDay31 || isExpired) && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-100"
            onClick={downloadCsv}
            disabled={downloading}
          >
            {downloading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            {cb.download}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-red-300 text-red-700 hover:bg-red-100"
            onClick={analyzeWithAI}
            disabled={analyzing}
          >
            {analyzing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <BrainCircuit className="w-3.5 h-3.5" />}
            {analyzing ? cb.analyzing : cb.analyzeBtn}
          </Button>

          {isExpired && (
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-red-600 hover:bg-red-700"
              onClick={resetCycle}
              disabled={resetting}
            >
              {resetting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />}
              {cb.startNewCycle}
            </Button>
          )}
        </div>
      )}

      {/* Warning: day 28-30 actions reminder */}
      {isWarning && (
        <div className="text-xs text-amber-700 space-y-0.5 bg-amber-100/60 rounded-lg px-3 py-2">
          <p>📅 <strong>{cb.day31Short}:</strong> {cb.day31Reminder}</p>
          <p>🔄 <strong>{cb.day32Short}:</strong> {cb.day32Reminder}</p>
        </div>
      )}

      {/* AI analysis result */}
      {analysis && (
        <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setAnalysisExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-500" />
              {cb.analysisTitle}
              <span className={`font-bold ${trendColor(analysis.trendScore)}`}>
                {trendArrow(analysis.trendScore)} {analysis.trend}
              </span>
            </span>
            {analysisExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {analysisExpanded && (
            <div className="px-4 pb-4 space-y-3 text-sm">
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>

              {analysis.achievements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{cb.achievements}</p>
                  <ul className="space-y-1">
                    {analysis.achievements.map((a, i) => (
                      <li key={i} className="flex gap-2 text-green-700 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.nextCycleGoals.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{cb.nextCycleGoals}</p>
                  <ul className="space-y-1">
                    {analysis.nextCycleGoals.map((g, i) => (
                      <li key={i} className="flex gap-2 text-indigo-700 text-xs">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">{i + 1}</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isExpired && (
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 mt-1"
                  onClick={resetCycle}
                  disabled={resetting}
                >
                  {resetting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                  {cb.startNewCycle}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
