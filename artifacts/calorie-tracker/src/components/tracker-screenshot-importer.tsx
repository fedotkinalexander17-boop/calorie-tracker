import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Loader2, AlertCircle, ImagePlus, X,
  CheckCircle2, Footprints, Flame, HeartPulse, Moon, Sun,
  Activity, Clock, ChevronRight,
} from "lucide-react";
import { useT } from "@/lib/i18n";

interface TrackerData {
  trackerApp: string;
  caloriesBurned: number | null;
  steps: number | null;
  heartRate: number | null;
  stressLevel: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  sleepDuration: number | null;
  notes: string;
  confidence: "high" | "medium" | "low";
}

export interface TrackerImportResult {
  caloriesBurned: number | null;
  stressLevel: number | null;
  bedtime: string | null;
  wakeTime: string | null;
}

interface Props {
  onApply: (data: TrackerImportResult) => void;
}

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

const CONFIDENCE_RU: Record<string, string> = {
  high: "Высокая точность",
  medium: "Средняя точность",
  low: "Низкая точность",
};

type FieldKey = "caloriesBurned" | "stressLevel" | "bedtime" | "wakeTime";

export function TrackerScreenshotImporter({ onApply }: Props) {
  const { t, lang } = useT();
  const ti = t.trackerImport;

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<FieldKey, boolean>>({
    caloriesBurned: true,
    stressLevel: true,
    bedtime: true,
    wakeTime: true,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setPreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setAnalyzing(false);
    setSelected({ caloriesBurned: true, stressLevel: true, bedtime: true, wakeTime: true });
  };

  const handleClose = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  const loadFile = (file: File) => {
    setError(null);
    const mime = file.type || "image/jpeg";
    setMimeType(mime);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-tracker-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Ошибка ${res.status}`);
      }
      const data = (await res.json()) as TrackerData;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ti.parseFailed);
    } finally {
      setAnalyzing(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply({
      caloriesBurned: selected.caloriesBurned ? result.caloriesBurned : null,
      stressLevel: selected.stressLevel ? result.stressLevel : null,
      bedtime: selected.bedtime ? result.bedtime : null,
      wakeTime: selected.wakeTime ? result.wakeTime : null,
    });
    handleClose(false);
  };

  const toggleField = (key: FieldKey) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasApplicable = result &&
    (result.caloriesBurned != null || result.stressLevel != null ||
      result.bedtime != null || result.wakeTime != null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Smartphone className="w-4 h-4" />
          <span>{ti.buttonLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            {ti.dialogTitle}
          </DialogTitle>
          <DialogDescription>{ti.dialogSubtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {!result ? (
            <>
              {/* Upload zone */}
              <div
                className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden
                  ${preview ? "border-gray-200" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                style={{ minHeight: 180 }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) loadFile(file);
                }}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="screenshot" className="w-full object-contain max-h-64" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <ImagePlus className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-700">{ti.uploadHint}</p>
                      <p className="text-xs text-gray-400 mt-1">{ti.uploadSub}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {["Apple Health", "Google Fit", "Samsung Health", "Garmin", "Mi Fit"].map((app) => (
                        <span key={app} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{app}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                  e.target.value = "";
                }}
              />

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!imageBase64 || analyzing}
                onClick={analyze}
              >
                {analyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />{ti.analyzing}</>
                  : <><Activity className="w-4 h-4" />{ti.analyzeBtn}</>}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              {/* App & confidence */}
              <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3">
                <Smartphone className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{result.trackerApp}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{result.notes}</p>
                </div>
                <Badge className={`text-xs flex-shrink-0 ${CONFIDENCE_BADGE[result.confidence]}`} variant="secondary">
                  {lang === "ru" ? CONFIDENCE_RU[result.confidence] : result.confidence}
                </Badge>
              </div>

              {/* Display-only fields */}
              <div className="grid grid-cols-2 gap-2">
                {result.steps != null && (
                  <StatCard icon={<Footprints className="w-4 h-4 text-blue-500" />} label={ti.steps} value={result.steps.toLocaleString()} />
                )}
                {result.heartRate != null && (
                  <StatCard icon={<HeartPulse className="w-4 h-4 text-rose-500" />} label={ti.heartRate} value={`${result.heartRate} уд/мин`} />
                )}
                {result.sleepDuration != null && (
                  <StatCard icon={<Moon className="w-4 h-4 text-indigo-500" />} label={ti.sleepDuration} value={`${result.sleepDuration}ч`} />
                )}
              </div>

              {/* Applicable fields */}
              {hasApplicable ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{ti.applyTitle}</p>
                  {result.caloriesBurned != null && (
                    <FieldRow
                      icon={<Flame className="w-4 h-4 text-orange-500" />}
                      label={ti.caloriesBurned}
                      value={`${result.caloriesBurned} ккал`}
                      checked={selected.caloriesBurned}
                      onToggle={() => toggleField("caloriesBurned")}
                    />
                  )}
                  {result.stressLevel != null && (
                    <FieldRow
                      icon={<HeartPulse className="w-4 h-4 text-rose-500" />}
                      label={ti.stressLevel}
                      value={`${result.stressLevel}/10`}
                      checked={selected.stressLevel}
                      onToggle={() => toggleField("stressLevel")}
                    />
                  )}
                  {result.bedtime != null && (
                    <FieldRow
                      icon={<Moon className="w-4 h-4 text-indigo-500" />}
                      label={ti.bedtime}
                      value={result.bedtime}
                      checked={selected.bedtime}
                      onToggle={() => toggleField("bedtime")}
                    />
                  )}
                  {result.wakeTime != null && (
                    <FieldRow
                      icon={<Sun className="w-4 h-4 text-amber-500" />}
                      label={ti.wakeTime}
                      value={result.wakeTime}
                      checked={selected.wakeTime}
                      onToggle={() => toggleField("wakeTime")}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground bg-gray-50 rounded-xl">
                  {ti.noApplicableData}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  {ti.tryAgain}
                </Button>
                {hasApplicable && (
                  <Button className="flex-1 gap-1" onClick={apply}>
                    {ti.apply}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-border/40">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-none">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FieldRow({
  icon, label, value, checked, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left
        ${checked ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-100 opacity-60"}`}
    >
      {icon}
      <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-600 font-semibold">{value}</span>
      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${checked ? "bg-indigo-500" : "bg-gray-200"}`}>
        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
      </div>
    </button>
  );
}
