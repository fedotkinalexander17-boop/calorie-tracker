import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface TrackerData {
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

router.post("/analyze-tracker-screenshot", async (req, res): Promise<void> => {
  const { imageBase64, mimeType } = req.body as {
    imageBase64?: string;
    mimeType?: string;
  };

  if (!imageBase64 || !mimeType) {
    res.status(400).json({ error: "Необходимо загрузить скриншот" });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `Ты ассистент по анализу скриншотов фитнес-трекеров (Apple Health, Google Fit, Samsung Health, Garmin, Zepp/Mi Fit, Fitbit, Polar и других).
Извлеки из скриншота все доступные данные о здоровье и верни строго валидный JSON (без markdown-обёртки).
Правила:
- trackerApp: название приложения/устройства (например "Apple Health", "Samsung Health"). Если не определяется — "Неизвестное приложение".
- caloriesBurned: активные калории (ккал) или общее потребление калорий — только целое число или null.
- steps: количество шагов — только целое число или null.
- heartRate: пульс покоя или средний пульс за день (уд/мин) — только целое число или null.
- stressLevel: уровень стресса нормализованный от 1 до 10. Если трекер даёт % или уровень (Low/Medium/High) — пересчитай: Low→2, Medium→5, High→8. Если нет — null.
- bedtime: время отхода ко сну в формате HH:MM (24-часовой) или null.
- wakeTime: время пробуждения в формате HH:MM (24-часовой) или null.
- sleepDuration: продолжительность сна в часах (дробное число) или null.
- notes: краткий комментарий на русском языке о том, какие данные удалось извлечь и какие нет.
- confidence: "high" — если данные чётко читаются, "medium" — если частично, "low" — если скриншот нечёткий или нет данных трекера.

Формат:
{
  "trackerApp": "...",
  "caloriesBurned": число или null,
  "steps": число или null,
  "heartRate": число или null,
  "stressLevel": число 1-10 или null,
  "bedtime": "HH:MM" или null,
  "wakeTime": "HH:MM" или null,
  "sleepDuration": число или null,
  "notes": "...",
  "confidence": "high"|"medium"|"low"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: "text",
              text: "Извлеки данные о здоровье из этого скриншота фитнес-трекера.",
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      res.status(400).json({ error: "Нет ответа от ИИ" });
      return;
    }

    let data: TrackerData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      data = JSON.parse(jsonMatch ? jsonMatch[0] : content) as TrackerData;
    } catch {
      res.status(400).json({ error: "Не удалось разобрать ответ ИИ" });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error("analyze-tracker-screenshot error:", err);
    res.status(500).json({ error: "Ошибка анализа скриншота" });
  }
});

export default router;
