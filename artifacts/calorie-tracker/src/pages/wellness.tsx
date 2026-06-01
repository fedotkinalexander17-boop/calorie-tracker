import { useState, useEffect, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, ChevronRight, HeartPulse, Flame, Smile, Moon, Sun,
  Pill, Stethoscope, Clock, History, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  useGetWellnessEntry,
  useUpsertWellnessEntry,
  useGetWellnessHistory,
} from "@workspace/api-client-react";
import { WellnessSyncBar } from "@/components/wellness-sync-bar";
import { PostureAnalyzer } from "@/components/posture-analyzer";
import { TrackerScreenshotImporter, type TrackerImportResult } from "@/components/tracker-screenshot-importer";
import { PostureCycleBanner } from "@/components/posture-cycle-banner";
import { ProGate } from "@/components/pro-gate";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string, lang: string) {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function formatShortDate(dateStr: string, lang: string) {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { day: "numeric", month: "short" });
}

function formatDateTime(iso: string, lang: string) {
  const d = new Date(iso);
  return d.toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function sleepHours(bedtime: string | null | undefined, wakeTime: string | null | undefined): number | null {
  if (!bedtime || !wakeTime) return null;
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  const bedMin = bh * 60 + bm;
  const wakeMin = wh * 60 + wm;
  const diff = wakeMin >= bedMin ? wakeMin - bedMin : (1440 - bedMin) + wakeMin;
  return Math.round(diff / 6) / 10;
}

function stressColor(level: number) {
  if (level <= 3) return "bg-emerald-100 text-emerald-700";
  if (level <= 6) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function stressBarColor(level: number) {
  if (level <= 3) return "#10b981";
  if (level <= 6) return "#f59e0b";
  return "#ef4444";
}

export default function Wellness() {
  const { t, lang } = useT();
  const wt = t.wellness;
  const { toast } = useToast();

  const [date, setDate] = useState(todayStr());
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [caloriesBurned, setCaloriesBurned] = useState<string>("");
  const [mood, setMood] = useState<string>("");
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [stressSet, setStressSet] = useState(false);
  const [bedtime, setBedtime] = useState<string>("");
  const [wakeTime, setWakeTime] = useState<string>("");
  const [supplements, setSupplements] = useState<string>("");
  const [medications, setMedications] = useState<string>("");

  const { data: entry, isLoading } = useGetWellnessEntry(
    { date },
    { query: { retry: false, staleTime: 30_000 } }
  );

  const upsert = useUpsertWellnessEntry();

  useEffect(() => {
    if (entry) {
      setCaloriesBurned(entry.caloriesBurned != null ? String(entry.caloriesBurned) : "");
      setMood(entry.mood ?? "");
      setStressLevel(entry.stressLevel ?? 5);
      setStressSet(entry.stressLevel != null);
      setBedtime(entry.bedtime ?? "");
      setWakeTime(entry.wakeTime ?? "");
      setSupplements(entry.supplements ?? "");
      setMedications(entry.medications ?? "");
    } else if (!isLoading) {
      setCaloriesBurned("");
      setMood("");
      setStressLevel(5);
      setStressSet(false);
      setBedtime("");
      setWakeTime("");
      setSupplements("");
      setMedications("");
    }
  }, [entry, isLoading, date]);

  const analyticsFrom = addDays(todayStr(), -29);
  const historyFrom = addDays(date, -13);

  const { data: analyticsHistory } = useGetWellnessHistory(
    { from: analyticsFrom, to: todayStr() },
    { query: { enabled: showAnalytics, staleTime: 0 } }
  );

  const { data: history } = useGetWellnessHistory(
    { from: historyFrom, to: date },
    { query: { enabled: showHistory, staleTime: 30_000 } }
  );

  const chartData = useMemo(() => {
    if (!analyticsHistory) return [];
    return analyticsHistory.map((h) => ({
      date: h.date,
      label: formatShortDate(h.date, lang),
      stress: h.stressLevel ?? null,
      sleep: sleepHours(h.bedtime, h.wakeTime),
      calories: h.caloriesBurned ?? null,
    }));
  }, [analyticsHistory, lang]);

  const hasChartData = chartData.some(
    (d) => d.stress != null || d.sleep != null || d.calories != null
  );

  function handleTrackerImport(data: TrackerImportResult) {
    if (data.caloriesBurned != null) setCaloriesBurned(String(data.caloriesBurned));
    if (data.stressLevel != null) { setStressLevel(data.stressLevel); setStressSet(true); }
    if (data.bedtime) setBedtime(data.bedtime);
    if (data.wakeTime) setWakeTime(data.wakeTime);
    toast({
      title: lang === "ru" ? "Данные применены" : "Data applied",
      description: lang === "ru" ? "Проверьте поля и сохраните запись" : "Review the fields and save your entry",
    });
  }

  async function handleSave() {
    try {
      await upsert.mutateAsync({
        data: {
          date,
          caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
          mood: mood || null,
          stressLevel: stressSet ? stressLevel : null,
          bedtime: bedtime || null,
          wakeTime: wakeTime || null,
          supplements: supplements || null,
          medications: medications || null,
        },
      });
      toast({ title: wt.toastSaved, description: wt.toastSavedDesc });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    }
  }

  const isToday = date === todayStr();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">{wt.title}</h1>
        <p className="text-muted-foreground text-sm">{wt.subtitle}</p>
      </div>

      <WellnessSyncBar />

      <PostureCycleBanner />

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="font-medium text-foreground capitalize">{formatDate(date, lang)}</span>
          {isToday && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {lang === "ru" ? "Сегодня" : "Today"}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))} disabled={isToday}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {entry && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {wt.recordedAt}: {formatDateTime(entry.recordedAt, lang)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-blue-200/60 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10">
          <CardContent className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-semibold text-foreground">
                {lang === "ru" ? "Анализ осанки по фото" : "AI Posture Analysis"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lang === "ru"
                  ? "Загрузите фото — ИИ оценит осанку и даст рекомендации"
                  : "Upload a photo and get an instant AI posture assessment"}
              </p>
            </div>
            <ProGate>
              <PostureAnalyzer />
            </ProGate>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/60 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/10">
          <CardContent className="flex flex-col gap-3 py-4">
            <div>
              <p className="font-semibold text-foreground">
                {lang === "ru" ? "Импорт из трекера" : "Import from Tracker"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {lang === "ru"
                  ? "Загрузите скриншот Apple Health, Google Fit и других — данные заполнятся автоматически"
                  : "Upload a screenshot from Apple Health, Google Fit etc. — data fills in automatically"}
              </p>
            </div>
            <ProGate>
              <TrackerScreenshotImporter onApply={handleTrackerImport} />
            </ProGate>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              {wt.caloriesBurned}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              min={0}
              placeholder={wt.caloriesBurnedPlaceholder}
              value={caloriesBurned}
              onChange={(e) => setCaloriesBurned(e.target.value)}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Smile className="w-4 h-4 text-yellow-500" />
              {wt.mood}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={wt.moodPlaceholder}
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="resize-none h-20"
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              {wt.stressLevel}
              {stressSet && (
                <Badge className={`ml-auto text-xs font-medium ${stressColor(stressLevel)}`}>
                  {stressLevel}/10
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-14">{wt.stressLow}</span>
              <Slider
                min={1} max={10} step={1}
                value={[stressLevel]}
                onValueChange={([v]) => { setStressLevel(v); setStressSet(true); }}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-14 text-right">{wt.stressHigh}</span>
            </div>
            <div className="flex justify-center gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => { setStressLevel(n); setStressSet(true); }}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                    stressSet && stressLevel === n
                      ? n <= 3 ? "bg-emerald-500 text-white" : n <= 6 ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              {wt.bedtime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="text-lg font-medium" />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              {wt.wakeTime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="text-lg font-medium" />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-500" />
              {wt.supplements}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={wt.supplementsPlaceholder}
              value={supplements}
              onChange={(e) => setSupplements(e.target.value)}
              className="resize-none h-24"
            />
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-500" />
              {wt.medications}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={wt.medicationsPlaceholder}
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="resize-none h-24"
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleSave} disabled={upsert.isPending} className="flex-1 sm:flex-none sm:min-w-32">
          {upsert.isPending ? wt.saving : wt.save}
        </Button>
        <Button variant="outline" onClick={() => setShowAnalytics((v) => !v)} className="flex-1 sm:flex-none flex items-center justify-center gap-2">
          <BarChart3 className="w-4 h-4" />
          <span className="hidden xs:inline">{wt.analyticsTitle}</span>
          <span className="xs:hidden">{wt.analyticsTitle}</span>
        </Button>
        <Button variant="outline" onClick={() => setShowHistory((v) => !v)} className="flex-1 sm:flex-none flex items-center justify-center gap-2">
          <History className="w-4 h-4" />
          <span>{wt.history}</span>
        </Button>
      </div>

      {showAnalytics && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              {wt.analyticsTitle}
            </CardTitle>
            <CardDescription className="text-xs">{wt.analyticsSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasChartData ? (
              <p className="text-sm text-muted-foreground text-center py-6">{wt.noChartData}</p>
            ) : (
              <div className="space-y-8">
                {chartData.some((d) => d.stress != null) && (
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      {wt.stressChart}
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          formatter={(val: number) => [`${val}/10`, wt.stressChart]}
                          labelFormatter={(label) => label}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          dot={(props) => {
                            const { cx, cy, value } = props;
                            if (value == null) return <g key={`dot-${cx}`} />;
                            return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={stressBarColor(value)} stroke="white" strokeWidth={1} />;
                          }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartData.some((d) => d.sleep != null) && (
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      {wt.sleepChart}
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="ч" />
                        <Tooltip
                          formatter={(val: number) => [`${val}ч`, wt.sleep]}
                          labelFormatter={(label) => label}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar dataKey="sleep" fill="#6366f1" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`sleep-${index}`}
                              fill={
                                entry.sleep == null ? "transparent"
                                  : entry.sleep >= 7 ? "#6366f1"
                                  : entry.sleep >= 5 ? "#a78bfa"
                                  : "#e879f9"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {chartData.some((d) => d.calories != null) && (
                  <div>
                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      {wt.caloriesChart}
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          formatter={(val: number) => [`${val} ${wt.kcal}`, wt.caloriesChart]}
                          labelFormatter={(label) => label}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar dataKey="calories" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showHistory && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              {wt.history} — {lang === "ru" ? "последние 14 дней" : "last 14 days"}
            </CardTitle>
            <CardDescription className="text-xs">{historyFrom} — {date}</CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{wt.historyEmpty}</p>
            ) : (
              <div className="space-y-3">
                {[...history].reverse().map((h) => {
                  const sleep = sleepHours(h.bedtime, h.wakeTime);
                  return (
                    <div
                      key={h.id}
                      className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-border/30 cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => { setDate(h.date); setShowHistory(false); }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm capitalize">{formatDate(h.date, lang)}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(h.updatedAt, lang)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {h.caloriesBurned != null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {h.caloriesBurned} {lang === "ru" ? "ккал" : "kcal"}
                          </Badge>
                        )}
                        {h.stressLevel != null && (
                          <Badge className={`text-xs ${stressColor(h.stressLevel)}`}>
                            <HeartPulse className="w-3 h-3 mr-1" />
                            {h.stressLevel}/10
                          </Badge>
                        )}
                        {sleep != null && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Moon className="w-3 h-3 text-indigo-400" />
                            {sleep}{lang === "ru" ? "ч сна" : "h sleep"}
                          </Badge>
                        )}
                        {h.mood && (
                          <Badge variant="outline" className="text-xs gap-1 max-w-[180px] truncate">
                            <Smile className="w-3 h-3 text-yellow-400 shrink-0" />
                            <span className="truncate">{h.mood}</span>
                          </Badge>
                        )}
                        {h.supplements && (
                          <Badge variant="outline" className="text-xs gap-1 max-w-[180px] truncate">
                            <Pill className="w-3 h-3 text-teal-400 shrink-0" />
                            <span className="truncate">{h.supplements}</span>
                          </Badge>
                        )}
                        {h.medications && (
                          <Badge variant="outline" className="text-xs gap-1 max-w-[180px] truncate">
                            <Stethoscope className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{h.medications}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
