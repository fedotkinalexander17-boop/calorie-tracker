import { eq, and, asc } from "drizzle-orm";
import { db, mealsTable, foodsTable, settingsTable } from "@workspace/db";
import { wellnessLogTable } from "@workspace/db/schema";
import { ensureSheetTab, clearRange, updateValues, formatHeader, createSpreadsheet, writeRows, spreadsheetUrl } from "./google-sheets";

const MEAL_TYPE_RU: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

function syncKey(userId: string): string {
  return `user:${userId}:sheets_auto_sync_spreadsheet_id`;
}

export async function getAutoSyncSpreadsheetId(userId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, syncKey(userId)));
  return row?.value ?? null;
}

export async function setAutoSyncSpreadsheetId(userId: string, id: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key: syncKey(userId), value: id })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: id } });
}

export async function clearAutoSyncSpreadsheetId(userId: string): Promise<void> {
  await db.delete(settingsTable).where(eq(settingsTable.key, syncKey(userId)));
}

export async function syncDayToSheets(spreadsheetId: string, date: string, userId: string): Promise<void> {
  const rows = await db
    .select({
      foodName: foodsTable.name,
      mealType: mealsTable.mealType,
      servings: mealsTable.servings,
      calories: foodsTable.calories,
      protein: foodsTable.protein,
      carbs: foodsTable.carbs,
      fat: foodsTable.fat,
      servingSize: foodsTable.servingSize,
    })
    .from(mealsTable)
    .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
    .where(and(eq(mealsTable.date, date), eq(mealsTable.userId, userId)))
    .orderBy(mealsTable.createdAt);

  const meals = rows.map((r) => ({
    ...r,
    calories: Math.round(r.calories * r.servings),
    protein: Math.round(r.protein * r.servings * 10) / 10,
    carbs: Math.round(r.carbs * r.servings * 10) / 10,
    fat: Math.round(r.fat * r.servings * 10) / 10,
  }));

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const sheetId = await ensureSheetTab(spreadsheetId, date);
  const range = `${date}!A1`;

  await clearRange(spreadsheetId, `${date}!A:H`);

  const header = ["Продукт", "Приём пищи", "Порций", "Размер порции", "Калории", "Белки (г)", "Углеводы (г)", "Жиры (г)"];
  const dataRows = meals.map((m) => [
    m.foodName,
    MEAL_TYPE_RU[m.mealType] ?? m.mealType,
    m.servings,
    m.servingSize,
    m.calories,
    m.protein,
    m.carbs,
    m.fat,
  ]);
  const totalRow = [
    "ИТОГО", "", "", "",
    Math.round(totals.calories),
    Math.round(totals.protein * 10) / 10,
    Math.round(totals.carbs * 10) / 10,
    Math.round(totals.fat * 10) / 10,
  ];

  await updateValues(spreadsheetId, range, [header, ...dataRows, [], totalRow]);
  await formatHeader(spreadsheetId, sheetId);
}

export function triggerSync(date: string, userId: string): void {
  getAutoSyncSpreadsheetId(userId).then((spreadsheetId) => {
    if (!spreadsheetId) return;
    syncDayToSheets(spreadsheetId, date, userId).catch((err) => {
      console.error("[auto-sync] Failed to sync day:", date, err?.message);
    });
  }).catch(() => {});
}

// ─── Wellness sync ────────────────────────────────────────────────────────────

const WELLNESS_SYNC_KEY = (userId: string) => `user:${userId}:wellness_auto_sync_spreadsheet_id`;
const WELLNESS_TAB = "Самочувствие";
const WELLNESS_HEADER = [
  "Дата", "Потрачено ккал", "Ощущения", "Уровень стресса (1-10)",
  "Время отбоя", "Время пробуждения", "Сон (ч)",
  "Принимаемые БАД", "Принимаемые лекарства", "Записано", "Обновлено",
];

function sleepHours(bedtime: string | null, wakeTime: string | null): string {
  if (!bedtime || !wakeTime) return "";
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  const bedMinutes = bh * 60 + bm;
  const wakeMinutes = wh * 60 + wm;
  const diff = wakeMinutes >= bedMinutes
    ? wakeMinutes - bedMinutes
    : (1440 - bedMinutes) + wakeMinutes;
  return (Math.round(diff / 6) / 10).toFixed(1);
}

export async function getWellnessSyncSpreadsheetId(userId: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, WELLNESS_SYNC_KEY(userId)));
  return row?.value ?? null;
}

export async function setWellnessSyncSpreadsheetId(userId: string, id: string): Promise<void> {
  await db.insert(settingsTable).values({ key: WELLNESS_SYNC_KEY(userId), value: id })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: id } });
}

export async function clearWellnessSyncSpreadsheetId(userId: string): Promise<void> {
  await db.delete(settingsTable).where(eq(settingsTable.key, WELLNESS_SYNC_KEY(userId)));
}

export async function syncWellnessToSheets(spreadsheetId: string, userId: string): Promise<void> {
  const entries = await db.select().from(wellnessLogTable)
    .where(eq(wellnessLogTable.userId, userId))
    .orderBy(asc(wellnessLogTable.date));

  const sheetId = await ensureSheetTab(spreadsheetId, WELLNESS_TAB);
  await clearRange(spreadsheetId, `${WELLNESS_TAB}!A:K`);

  const dataRows = entries.map((e) => [
    e.date,
    e.caloriesBurned ?? "",
    e.mood ?? "",
    e.stressLevel ?? "",
    e.bedtime ?? "",
    e.wakeTime ?? "",
    sleepHours(e.bedtime, e.wakeTime),
    e.supplements ?? "",
    e.medications ?? "",
    e.recordedAt.toISOString().replace("T", " ").slice(0, 16),
    e.updatedAt.toISOString().replace("T", " ").slice(0, 16),
  ]);

  await updateValues(spreadsheetId, `${WELLNESS_TAB}!A1`, [WELLNESS_HEADER, ...dataRows]);
  await formatHeader(spreadsheetId, sheetId);
}

export function triggerWellnessSync(userId: string): void {
  getWellnessSyncSpreadsheetId(userId).then((spreadsheetId) => {
    if (!spreadsheetId) return;
    syncWellnessToSheets(spreadsheetId, userId).catch((err) => {
      console.error("[wellness-sync] Failed:", err?.message);
    });
  }).catch(() => {});
}

// ─── Posture sheet ────────────────────────────────────────────────────────────

const POSTURE_SHEET_KEY = (userId: string) => `user:${userId}:posture_sheet_id`;
const POSTURE_SHEET_CREATED_KEY = (userId: string) => `user:${userId}:posture_sheet_created_at`;

const POSTURE_CYCLE_DAYS = 30;

const POSTURE_HEADER = [
  "Дата", "Время", "Ракурсы",
  "Оценка (1-10)", "Итог",
  "Видимые дефекты",
  "Голова и шея (балл)", "Голова и шея (наблюдение)",
  "Плечи (балл)", "Плечи (наблюдение)",
  "Позвоночник (балл)", "Позвоночник (наблюдение)",
  "Таз и бёдра (балл)", "Таз и бёдра (наблюдение)",
  "Рекомендации",
  "Комментарий ИИ",
];

export async function getPostureSheetId(userId: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, POSTURE_SHEET_KEY(userId)));
  return row?.value ?? null;
}

async function setPostureSheetId(userId: string, id: string): Promise<void> {
  await db.insert(settingsTable).values({ key: POSTURE_SHEET_KEY(userId), value: id })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: id } });
}

async function setPostureSheetCreatedAt(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(settingsTable).values({ key: POSTURE_SHEET_CREATED_KEY(userId), value: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: now } });
}

async function getPostureSheetCreatedAt(userId: string): Promise<Date | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, POSTURE_SHEET_CREATED_KEY(userId)));
  if (!row?.value) return null;
  return new Date(row.value);
}

export async function resetPostureSheet(userId: string): Promise<void> {
  await db.delete(settingsTable).where(eq(settingsTable.key, POSTURE_SHEET_KEY(userId)));
  await db.delete(settingsTable).where(eq(settingsTable.key, POSTURE_SHEET_CREATED_KEY(userId)));
}

export type PostureCyclePhase = "normal" | "warning" | "day31" | "expired";

export interface PostureCycleStatus {
  phase: PostureCyclePhase;
  dayCount: number;
  daysLeft: number;
  hasSheet: boolean;
  sheetUrl: string | null;
}

export async function getPostureCycleStatus(userId: string): Promise<PostureCycleStatus> {
  const sheetId = await getPostureSheetId(userId);
  const createdAt = await getPostureSheetCreatedAt(userId);

  if (!sheetId || !createdAt) {
    return { phase: "normal", dayCount: 0, daysLeft: POSTURE_CYCLE_DAYS, hasSheet: false, sheetUrl: null };
  }

  const diffMs = Date.now() - createdAt.getTime();
  const dayCount = Math.max(1, Math.floor(diffMs / 86_400_000) + 1);
  const daysLeft = Math.max(0, POSTURE_CYCLE_DAYS - dayCount);

  let phase: PostureCyclePhase;
  if (dayCount > POSTURE_CYCLE_DAYS + 1) phase = "expired";
  else if (dayCount === POSTURE_CYCLE_DAYS + 1) phase = "day31";
  else if (dayCount >= POSTURE_CYCLE_DAYS - 2) phase = "warning";
  else phase = "normal";

  return { phase, dayCount, daysLeft, hasSheet: true, sheetUrl: spreadsheetUrl(sheetId) };
}

const GRADE_RU: Record<string, string> = {
  Excellent: "Отлично",
  Good: "Хорошо",
  Fair: "Удовлетворительно",
  Poor: "Требует внимания",
};

interface PostureResultForSheet {
  overallScore: number;
  grade: string;
  defects: string;
  notes: string;
  areas: { name: string; score: number; note: string }[];
  recommendations: string[];
}

export async function appendPostureToSheets(
  userId: string,
  result: PostureResultForSheet,
  angles: string[],
): Promise<{ url: string; cycleReset: boolean }> {
  const status = await getPostureCycleStatus(userId);
  let cycleReset = false;

  if (status.phase === "expired") {
    await resetPostureSheet(userId);
    cycleReset = true;
  }

  let spreadsheetId = await getPostureSheetId(userId);
  const isNew = !spreadsheetId;

  if (isNew) {
    spreadsheetId = await createSpreadsheet(`📋 Анализ осанки — Трекер здоровья 360 (${userId})`);
    await setPostureSheetId(userId, spreadsheetId);
    await setPostureSheetCreatedAt(userId);
    await writeRows(spreadsheetId, "A1", [POSTURE_HEADER]);
    await formatHeader(spreadsheetId, 0);
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  const areaByName = (name: string) => result.areas.find((a) => a.name === name);

  const head = areaByName("Голова и шея");
  const shoulders = areaByName("Плечи");
  const spine = areaByName("Позвоночник");
  const hips = areaByName("Таз и бёдра");

  const dataRow = [
    dateStr,
    timeStr,
    (angles ?? []).join(", "),
    result.overallScore,
    GRADE_RU[result.grade] ?? result.grade,
    result.defects ?? "",
    head?.score ?? "",
    head?.note ?? "",
    shoulders?.score ?? "",
    shoulders?.note ?? "",
    spine?.score ?? "",
    spine?.note ?? "",
    hips?.score ?? "",
    hips?.note ?? "",
    result.recommendations.join(" | "),
    result.notes ?? "",
  ];

  await writeRows(spreadsheetId, "A1", [dataRow]);

  return { url: spreadsheetUrl(spreadsheetId), cycleReset };
}
