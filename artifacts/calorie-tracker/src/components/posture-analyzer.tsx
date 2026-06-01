import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Loader2, AlertCircle, RotateCcw,
  CheckCircle2, AlertTriangle, XCircle, X, ImagePlus,
  FileSpreadsheet, ExternalLink, Download,
} from "lucide-react";
import { useT } from "@/lib/i18n";

interface PhotoSlot {
  key: "front" | "right" | "left" | "back" | "upperBack";
  preview: string | null;
  imageBase64: string | null;
  mimeType: string;
}

interface PostureArea {
  name: string;
  score: number;
  status: "good" | "ok" | "warning";
  note: string;
}

interface PostureResult {
  overallScore: number;
  grade: string;
  defects: string;
  areas: PostureArea[];
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  notes: string;
}

const ANGLE_KEYS = ["front", "right", "left", "back", "upperBack"] as const;

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  good: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />,
  ok: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />,
  warning: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />,
};

const STATUS_BG: Record<string, string> = {
  good: "bg-green-50 border-green-100",
  ok: "bg-yellow-50 border-yellow-100",
  warning: "bg-red-50 border-red-100",
};

const SCORE_COLOR = (score: number) =>
  score >= 8 ? "text-green-600" : score >= 6 ? "text-yellow-600" : "text-red-600";

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const color = score >= 8 ? "#22c55e" : score >= 6 ? "#eab308" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="88" height="88" viewBox="0 0 96 96" className="rotate-[-90deg]">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

const makeSlots = (): PhotoSlot[] =>
  ANGLE_KEYS.map((key) => ({ key, preview: null, imageBase64: null, mimeType: "image/jpeg" }));

export function PostureAnalyzer() {
  const { t } = useT();
  const p = t.posture;

  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<PhotoSlot[]>(makeSlots());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<PostureResult | null>(null);
  const [usedAngles, setUsedAngles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadedCount = slots.filter((s) => s.imageBase64).length;

  const reset = () => {
    setSlots(makeSlots());
    setResult(null);
    setError(null);
    setAnalyzing(false);
    setSaveState("idle");
    setSheetUrl(null);
    setUsedAngles([]);
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  const loadFile = (key: string, file: File) => {
    setError(null);
    const mime = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const b64 = dataUrl.split(",")[1];
      setSlots((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, preview: dataUrl, imageBase64: b64, mimeType: mime } : s
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const clearSlot = (key: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, preview: null, imageBase64: null, mimeType: "image/jpeg" } : s
      )
    );
  };

  const analyze = async () => {
    const filled = slots.filter((s) => s.imageBase64);
    if (filled.length === 0) { setError(p.atLeastOne); return; }
    setAnalyzing(true);
    setError(null);
    try {
      const angles = filled.map((s) => p.angles[s.key]);
      const images = filled.map((s) => ({
        imageBase64: s.imageBase64!,
        mimeType: s.mimeType,
        angle: p.angles[s.key],
      }));
      const res = await fetch("/api/analyze-posture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ images }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Ошибка ${res.status}`);
      }
      const data = (await res.json()) as PostureResult;
      setResult(data);
      setUsedAngles(angles);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : p.parseFailed);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveToSheets = async () => {
    if (!result) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/sheets/export-posture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result, angles: usedAngles }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { url: string; cycleReset?: boolean };
      setSheetUrl(data.url);
      setSaveState("saved");
      if (data.cycleReset) {
        window.dispatchEvent(new CustomEvent("posture-cycle-reset"));
      }
    } catch {
      setSaveState("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Activity className="w-4 h-4" />
          <span>{p.buttonLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {p.dialogTitle}
          </DialogTitle>
          <DialogDescription>{p.dialogSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {!result ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {slots.map((slot) => (
                  <PhotoSlotCard
                    key={slot.key}
                    slot={slot}
                    label={p.angles[slot.key]}
                    hint={p.angleHint}
                    sub={p.dropSub}
                    dragging={draggingKey === slot.key}
                    onDragEnter={() => setDraggingKey(slot.key)}
                    onDragLeave={() => setDraggingKey(null)}
                    onDrop={(file) => { setDraggingKey(null); loadFile(slot.key, file); }}
                    onClick={() => fileInputRefs.current[slot.key]?.click()}
                    onClear={() => clearSlot(slot.key)}
                    inputRef={(el) => { fileInputRefs.current[slot.key] = el; }}
                    onFileSelect={(file) => loadFile(slot.key, file)}
                  />
                ))}
              </div>

              {uploadedCount > 0 && (
                <p className="text-sm text-center text-muted-foreground">
                  {p.photosUploaded(uploadedCount)}
                </p>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button className="w-full" disabled={uploadedCount === 0 || analyzing} onClick={analyze}>
                {analyzing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{p.analyzing}</>
                  : p.analyzeBtn}
              </Button>
            </>
          ) : (
            <PostureResults
              result={result}
              p={p}
              onReset={reset}
              onSave={saveToSheets}
              saveState={saveState}
              sheetUrl={sheetUrl}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PhotoSlotCard({
  slot, label, hint, sub, dragging,
  onDragEnter, onDragLeave, onDrop, onClick, onClear, inputRef, onFileSelect,
}: {
  slot: PhotoSlot;
  label: string;
  hint: string;
  sub: string;
  dragging: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onClick: () => void;
  onClear: () => void;
  inputRef: (el: HTMLInputElement | null) => void;
  onFileSelect: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-center text-gray-600 truncate px-1">{label}</span>
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer aspect-[3/4] flex flex-col items-center justify-center overflow-hidden
          ${dragging ? "border-blue-400 bg-blue-50" : slot.preview ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}
        onClick={onClick}
        onDragOver={(e) => { e.preventDefault(); onDragEnter(); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith("image/")) onDrop(file);
        }}
      >
        {slot.preview ? (
          <>
            <img src={slot.preview} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label="Удалить фото"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center">
            <ImagePlus className="w-6 h-6 text-gray-300" />
            <span className="text-[10px] text-gray-400 leading-tight">{hint}</span>
            <span className="text-[9px] text-gray-300">{sub}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function PostureResults({
  result, p, onReset, onSave, saveState, sheetUrl,
}: {
  result: PostureResult;
  p: ReturnType<typeof useT>["t"]["posture"];
  onReset: () => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  sheetUrl: string | null;
}) {
  const [downloading, setDownloading] = useState(false);

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/sheets/download-posture", {
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Ошибка ${res.status}`);
      }
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
      alert(e instanceof Error ? e.message : "Ошибка скачивания");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
        <div className="relative flex-shrink-0">
          <ScoreRing score={result.overallScore} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${SCORE_COLOR(result.overallScore)}`}>
              {result.overallScore}
            </span>
            <span className="text-xs text-gray-500">/10</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500">{p.overallScore}</p>
          <p className="text-xl font-semibold">
            {p.grade[result.grade as keyof typeof p.grade] ?? result.grade}
          </p>
          <Badge className={`mt-1 text-xs ${CONFIDENCE_COLORS[result.confidence]}`} variant="secondary">
            {p.confidence[result.confidence]}
          </Badge>
        </div>
      </div>

      {/* Visible defects — main narrative */}
      {result.defects && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500">
            {p.defectsTitle}
          </h4>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{result.defects}</p>
          </div>
        </div>
      )}

      {/* General notes */}
      {result.notes && result.notes !== result.defects && (
        <p className="text-sm text-gray-500 italic px-1">{result.notes}</p>
      )}

      {/* Per-area breakdown — text-based */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500">
          {p.areasTitle}
        </h4>
        <div className="space-y-2">
          {result.areas.map((area) => (
            <div
              key={area.name}
              className={`flex gap-3 rounded-xl border p-3 ${STATUS_BG[area.status] ?? "bg-gray-50 border-gray-100"}`}
            >
              {STATUS_ICONS[area.status]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{area.name}</span>
                  <span className={`text-sm font-bold flex-shrink-0 ${SCORE_COLOR(area.score)}`}>
                    {area.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{area.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-500">
            {p.recommendations}
          </h4>
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save to Sheets */}
      <div className="space-y-2 pt-1">
        {saveState !== "saved" ? (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{p.saving}</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4 text-green-600" />{p.saveToSheets}</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800 font-medium flex-1">{p.saved}</span>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
                >
                  {p.openSheet}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={downloadCsv}
              disabled={downloading}
            >
              {downloading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Скачивание...</>
                : <><Download className="w-4 h-4 text-blue-600" />{p.downloadCsv}</>}
            </Button>
          </div>
        )}
        {saveState === "error" && (
          <p className="text-xs text-red-600 text-center">{p.saveError}</p>
        )}

        <Button variant="ghost" className="w-full gap-2 text-gray-500" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          {p.tryAgain}
        </Button>
      </div>
    </div>
  );
}
