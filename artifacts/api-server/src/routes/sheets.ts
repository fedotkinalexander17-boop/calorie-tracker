import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, mealsTable, foodsTable } from "@workspace/db";
import {
  createSpreadsheet,
  writeRows,
  formatHeader,
  spreadsheetUrl,
  readRows,
  parseSpreadsheetId,
} from "../lib/google-sheets";
import {
  getAutoSyncSpreadsheetId,
  setAutoSyncSpreadsheetId,
  clearAutoSyncSpreadsheetId,
  syncDayToSheets,
  getWellnessSyncSpreadsheetId,
  setWellnessSyncSpreadsheetId,
  clearWellnessSyncSpreadsheetId,
  syncWellnessToSheets,
  appendPostureToSheets,
  getPostureSheetId,
  getPostureCycleStatus,
  resetPostureSheet,
} from "../lib/sync-log";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const router: IRouter = Router();

// ─── One-off exports ────────────────────────────────────────────────────────

// POST /api/sheets/export-log  { date: "YYYY-MM-DD" }
router.post("/sheets/export-log", async (req, res): Promise<void> => {
  const date = req.body?.date;
  if (!date || typeof date !== "string") {
    res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    return;
  }
  try {
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
        userId: mealsTable.userId,
      })
      .from(mealsTable)
      .innerJoin(foodsTable, eq(mealsTable.foodId, foodsTable.id))
      .where(eq(mealsTable.date, date))
      .orderBy(mealsTable.createdAt);

    const userRows = rows.filter((r) => r.userId === req.userId);
    const meals = userRows.map((r) => ({
      ...r,
      calories: Math.round(r.calories * r.servings),
      protein: Math.round(r.protein * r.servings * 10) / 10,
      carbs: Math.round(r.carbs * r.servings * 10) / 10,
      fat: Math.round(r.fat * r.servings * 10) / 10,
    }));
    const totals = meals.reduce(
      (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const MEAL_TYPE_RU: Record<string, string> = { breakfast: "Завтрак", lunch: "Обед", dinner: "Ужин", snack: "Перекус" };
    const spreadsheetId = await createSpreadsheet(`Дневник питания ${date}`);
    const header = ["Продукт", "Приём пищи", "Порций", "Размер порции", "Калории", "Белки (г)", "Углеводы (г)", "Жиры (г)"];
    const dataRows = meals.map((m) => [m.foodName, MEAL_TYPE_RU[m.mealType] ?? m.mealType, m.servings, m.servingSize, m.calories, m.protein, m.carbs, m.fat]);
    const totalRow = ["ИТОГО", "", "", "", Math.round(totals.calories), Math.round(totals.protein * 10) / 10, Math.round(totals.carbs * 10) / 10, Math.round(totals.fat * 10) / 10];
    await writeRows(spreadsheetId, "A1", [header, ...dataRows, [], totalRow]);
    await formatHeader(spreadsheetId, 0);
    res.json({ url: spreadsheetUrl(spreadsheetId), spreadsheetId });
  } catch (err) {
    console.error("export-log error:", err);
    res.status(500).json({ error: "Failed to export to Google Sheets" });
  }
});

// POST /api/sheets/export-foods
router.post("/sheets/export-foods", async (_req, res): Promise<void> => {
  try {
    const foods = await db.select().from(foodsTable).orderBy(foodsTable.name);
    const spreadsheetId = await createSpreadsheet("Библиотека продуктов — Трекер здоровья 360");
    const header = ["Продукт", "Размер порции", "Калории", "Белки (г)", "Углеводы (г)", "Жиры (г)"];
    const dataRows = foods.map((f) => [f.name, f.servingSize, f.calories, f.protein, f.carbs, f.fat]);
    await writeRows(spreadsheetId, "A1", [header, ...dataRows]);
    await formatHeader(spreadsheetId, 0);
    res.json({ url: spreadsheetUrl(spreadsheetId), spreadsheetId });
  } catch (err) {
    console.error("export-foods error:", err);
    res.status(500).json({ error: "Failed to export to Google Sheets" });
  }
});

// ─── Auto-sync ───────────────────────────────────────────────────────────────

// GET /api/sheets/auto-sync/status
router.get("/sheets/auto-sync/status", async (req, res): Promise<void> => {
  try {
    const spreadsheetId = await getAutoSyncSpreadsheetId(req.userId);
    if (!spreadsheetId) {
      res.json({ enabled: false });
      return;
    }
    res.json({ enabled: true, spreadsheetId, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("auto-sync status error:", err);
    res.status(500).json({ error: "Failed to get auto-sync status" });
  }
});

// POST /api/sheets/auto-sync/enable
router.post("/sheets/auto-sync/enable", async (req, res): Promise<void> => {
  try {
    const existing = await getAutoSyncSpreadsheetId(req.userId);
    const spreadsheetId = existing ?? await createSpreadsheet("📊 Трекер здоровья 360 — Дневник питания");
    await setAutoSyncSpreadsheetId(req.userId, spreadsheetId);

    const today = (req.body?.date as string) ?? new Date().toISOString().split("T")[0];
    await syncDayToSheets(spreadsheetId, today, req.userId);

    res.json({ enabled: true, spreadsheetId, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("auto-sync enable error:", err);
    res.status(500).json({ error: "Failed to enable auto-sync" });
  }
});

// DELETE /api/sheets/auto-sync/disable
router.delete("/sheets/auto-sync/disable", async (req, res): Promise<void> => {
  try {
    await clearAutoSyncSpreadsheetId(req.userId);
    res.json({ enabled: false });
  } catch (err) {
    console.error("auto-sync disable error:", err);
    res.status(500).json({ error: "Failed to disable auto-sync" });
  }
});

// POST /api/sheets/auto-sync/sync-now  { date: "YYYY-MM-DD" }
router.post("/sheets/auto-sync/sync-now", async (req, res): Promise<void> => {
  const date = req.body?.date ?? new Date().toISOString().split("T")[0];
  try {
    const spreadsheetId = await getAutoSyncSpreadsheetId(req.userId);
    if (!spreadsheetId) {
      res.status(400).json({ error: "Auto-sync is not enabled" });
      return;
    }
    await syncDayToSheets(spreadsheetId, date, req.userId);
    res.json({ ok: true, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("sync-now error:", err);
    res.status(500).json({ error: "Failed to sync" });
  }
});

// ─── Import ──────────────────────────────────────────────────────────────────

// POST /api/sheets/import-foods  { spreadsheetUrl: "..." }
router.post("/sheets/import-foods", async (req, res): Promise<void> => {
  const rawUrl = req.body?.spreadsheetUrl;
  if (!rawUrl || typeof rawUrl !== "string") {
    res.status(400).json({ error: "spreadsheetUrl is required" });
    return;
  }

  const spreadsheetId = parseSpreadsheetId(rawUrl);
  if (!spreadsheetId) {
    res.status(400).json({ error: "Invalid Google Sheets URL or ID" });
    return;
  }

  try {
    const rows = await readRows(spreadsheetId, "A1:F1000");
    if (rows.length < 2) {
      res.json({ imported: 0, skipped: 0 });
      return;
    }

    const dataRows = rows.slice(1).filter((r) => r.length >= 3);

    let imported = 0;
    let skipped = 0;

    for (const row of dataRows) {
      const name = row[0]?.trim();
      const servingSize = row[1]?.trim() || "100г";
      const calories = parseFloat(row[2]);
      const protein = parseFloat(row[3] ?? "0");
      const carbs = parseFloat(row[4] ?? "0");
      const fat = parseFloat(row[5] ?? "0");

      if (!name || isNaN(calories)) { skipped++; continue; }
      if (name.toUpperCase().includes("ИТОГО") || name.toUpperCase().includes("TOTAL")) { skipped++; continue; }

      await db.insert(foodsTable).values({
        name,
        servingSize,
        calories: Math.round(calories),
        protein: isNaN(protein) ? 0 : protein,
        carbs: isNaN(carbs) ? 0 : carbs,
        fat: isNaN(fat) ? 0 : fat,
      });
      imported++;
    }

    res.json({ imported, skipped });
  } catch (err) {
    console.error("import-foods error:", err);
    res.status(500).json({ error: "Failed to read Google Sheets. Make sure the sheet is shared or your account has access." });
  }
});

// ─── Posture export ──────────────────────────────────────────────────────────

// POST /api/sheets/export-posture
router.post("/sheets/export-posture", async (req, res): Promise<void> => {
  try {
    const { result, angles } = req.body as {
      result: {
        overallScore: number;
        grade: string;
        defects: string;
        notes: string;
        areas: { name: string; score: number; note: string }[];
        recommendations: string[];
        confidence: string;
      };
      angles: string[];
    };

    if (!result || typeof result.overallScore !== "number") {
      res.status(400).json({ error: "result is required" });
      return;
    }

    const { url, cycleReset } = await appendPostureToSheets(req.userId, result, angles ?? []);
    res.json({ url, cycleReset });
  } catch (err) {
    console.error("export-posture error:", err);
    res.status(500).json({ error: "Не удалось сохранить в Google Sheets" });
  }
});

// ─── Posture CSV download ─────────────────────────────────────────────────────

function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
}

// GET /api/sheets/download-posture
router.get("/sheets/download-posture", async (req, res): Promise<void> => {
  try {
    const spreadsheetId = await getPostureSheetId(req.userId);
    if (!spreadsheetId) {
      res.status(404).json({ error: "Таблица ещё не создана. Сначала сохраните хотя бы один анализ." });
      return;
    }

    const rows = await readRows(spreadsheetId, "A:P");
    if (!rows || rows.length === 0) {
      res.status(404).json({ error: "Таблица пуста" });
      return;
    }

    const csv = toCSV(rows);
    const filename = `osanka_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  } catch (err) {
    console.error("download-posture error:", err);
    res.status(500).json({ error: "Не удалось скачать таблицу" });
  }
});

// ─── Posture cycle status / reset / AI-analysis ──────────────────────────────

// GET /api/sheets/posture-cycle-status
router.get("/sheets/posture-cycle-status", async (req, res): Promise<void> => {
  try {
    const status = await getPostureCycleStatus(req.userId);
    res.json(status);
  } catch (err) {
    console.error("posture-cycle-status error:", err);
    res.status(500).json({ error: "Ошибка получения статуса цикла" });
  }
});

// POST /api/sheets/posture-reset
router.post("/sheets/posture-reset", async (req, res): Promise<void> => {
  try {
    await resetPostureSheet(req.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("posture-reset error:", err);
    res.status(500).json({ error: "Ошибка сброса цикла" });
  }
});

// POST /api/sheets/analyze-posture-data
// Reads all rows from the user's posture sheet and asks AI for a 30-day health summary
router.post("/sheets/analyze-posture-data", async (req, res): Promise<void> => {
  try {
    const spreadsheetId = await getPostureSheetId(req.userId);
    if (!spreadsheetId) {
      res.status(404).json({ error: "Таблица не найдена. Сначала сохраните анализ осанки." });
      return;
    }

    const rows = await readRows(spreadsheetId, "A:P");
    if (!rows || rows.length < 2) {
      res.status(404).json({ error: "Недостаточно данных для анализа (нужно хотя бы 2 записи)" });
      return;
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    const tableText = dataRows.map((row, i) => {
      const cells = header.map((h, j) => `${h}: ${row[j] ?? "—"}`).join(", ");
      return `Запись ${i + 1}: ${cells}`;
    }).join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `Ты физиотерапевт, анализирующий динамику осанки пациента за 30-дневный цикл.
Тебе предоставлены данные из Google Sheets с результатами AI-анализа осанки за несколько сессий.
Дай развёрнутый анализ на русском языке в формате JSON:
{
  "trend": "<общая тенденция: улучшение, ухудшение или стабильность>",
  "trendScore": <число от -5 до 5, где 5=значительное улучшение, -5=значительное ухудшение, 0=стабильно>,
  "summary": "<краткое резюме прогресса за период, 2-3 предложения>",
  "achievements": ["<достижение 1>", "<достижение 2>"],
  "problemZones": ["<зона с проблемой>"],
  "nextCycleGoals": ["<цель на следующий цикл>", "<цель 2>", "<цель 3>"],
  "recommendations": ["<рекомендация 1>", "<рекомендация 2>"]
}`,
        },
        {
          role: "user",
          content: `Данные за цикл (${dataRows.length} сессий анализа осанки):\n\n${tableText}\n\nДай развёрнутый анализ прогресса.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "Нет ответа от ИИ" });
      return;
    }

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      res.status(500).json({ error: "Не удалось разобрать ответ ИИ" });
      return;
    }

    res.json({ analysis, sessionCount: dataRows.length });
  } catch (err) {
    console.error("analyze-posture-data error:", err);
    res.status(500).json({ error: "Ошибка анализа данных" });
  }
});

// ─── Wellness auto-sync ──────────────────────────────────────────────────────

router.get("/sheets/wellness-sync/status", async (req, res): Promise<void> => {
  try {
    const spreadsheetId = await getWellnessSyncSpreadsheetId(req.userId!);
    if (!spreadsheetId) { res.json({ enabled: false }); return; }
    res.json({ enabled: true, spreadsheetId, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("wellness-sync status error:", err);
    res.status(500).json({ error: "Failed to get wellness sync status" });
  }
});

router.post("/sheets/wellness-sync/enable", async (req, res): Promise<void> => {
  try {
    const existing = await getWellnessSyncSpreadsheetId(req.userId!);
    const spreadsheetId = existing ?? await createSpreadsheet("🌿 Дневник самочувствия — Трекер здоровья 360");
    await setWellnessSyncSpreadsheetId(req.userId!, spreadsheetId);
    await syncWellnessToSheets(spreadsheetId, req.userId!);
    res.json({ enabled: true, spreadsheetId, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("wellness-sync enable error:", err);
    res.status(500).json({ error: "Failed to enable wellness sync" });
  }
});

router.delete("/sheets/wellness-sync/disable", async (req, res): Promise<void> => {
  try {
    await clearWellnessSyncSpreadsheetId(req.userId!);
    res.json({ enabled: false });
  } catch (err) {
    console.error("wellness-sync disable error:", err);
    res.status(500).json({ error: "Failed to disable wellness sync" });
  }
});

router.post("/sheets/wellness-sync/sync-now", async (req, res): Promise<void> => {
  try {
    const spreadsheetId = await getWellnessSyncSpreadsheetId(req.userId!);
    if (!spreadsheetId) { res.status(400).json({ error: "Wellness sync is not enabled" }); return; }
    await syncWellnessToSheets(spreadsheetId, req.userId!);
    res.json({ ok: true, url: spreadsheetUrl(spreadsheetId) });
  } catch (err) {
    console.error("wellness sync-now error:", err);
    res.status(500).json({ error: "Failed to sync wellness data" });
  }
});

export default router;
