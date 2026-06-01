import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface PhotoInput {
  imageBase64: string;
  mimeType: string;
  angle: string;
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

router.post("/analyze-posture", async (req, res): Promise<void> => {
  const body = req.body as {
    images?: PhotoInput[];
    imageBase64?: string;
    mimeType?: string;
    angle?: string;
  };

  let photos: PhotoInput[] = [];

  if (Array.isArray(body.images) && body.images.length > 0) {
    photos = body.images.filter((p) => p.imageBase64 && p.mimeType);
  } else if (body.imageBase64 && body.mimeType) {
    photos = [{ imageBase64: body.imageBase64, mimeType: body.mimeType, angle: body.angle ?? "фото" }];
  }

  if (photos.length === 0) {
    res.status(400).json({ error: "Необходимо загрузить хотя бы одно фото" });
    return;
  }

  const photoDescriptions = photos.map((p) => `«${p.angle}»`).join(", ");
  const multiView = photos.length > 1;

  const imageContents = photos.flatMap((p) => [
    {
      type: "image_url" as const,
      image_url: { url: `data:${p.mimeType};base64,${p.imageBase64}` },
    },
    {
      type: "text" as const,
      text: `↑ Вид: ${p.angle}`,
    },
  ]);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `Ты физиотерапевт и эксперт по осанке. ${
          multiView
            ? `Тебе предоставлены ${photos.length} фотографий с разных ракурсов (${photoDescriptions}). Используй все фото для комплексного анализа осанки.`
            : "Тебе предоставлено одно фото."
        } Фокусируйся ТОЛЬКО на видимом положении тела — не идентифицируй личность. Отвечай строго валидным JSON-объектом, точно соответствующим структуре ниже. Все текстовые поля (defects, note, recommendations, notes) пиши НА РУССКОМ ЯЗЫКЕ:
{
  "overallScore": <целое число 1-10>,
  "grade": <"Excellent"|"Good"|"Fair"|"Poor">,
  "defects": "<подробное связное описание всех видимых дефектов осанки: что именно отклонено от нормы, в какую сторону, насколько выражено. Если дефектов нет — написать 'Видимых дефектов не обнаружено'. 3-6 предложений на русском языке.>",
  "areas": [
    { "name": "Голова и шея", "score": <1-10>, "status": <"good"|"ok"|"warning">, "note": "<конкретное наблюдение по зоне, 1-2 предложения>" },
    { "name": "Плечи", "score": <1-10>, "status": <"good"|"ok"|"warning">, "note": "<конкретное наблюдение по зоне, 1-2 предложения>" },
    { "name": "Позвоночник", "score": <1-10>, "status": <"good"|"ok"|"warning">, "note": "<конкретное наблюдение по зоне, 1-2 предложения>" },
    { "name": "Таз и бёдра", "score": <1-10>, "status": <"good"|"ok"|"warning">, "note": "<конкретное наблюдение по зоне, 1-2 предложения>" }
  ],
  "recommendations": [<3-5 конкретных, выполнимых рекомендаций на русском языке>],
  "confidence": <"high"|"medium"|"low">,
  "notes": "<общий итоговый комментарий на русском языке${multiView ? ", с учётом всех ракурсов" : ""}>"
}
Поля grade, status и confidence оставляй на английском (технические ключи). Если на фото нет чёткого изображения осанки, установи confidence: "low", overallScore: 0, grade: "Poor" и объясни в defects и notes. Никогда не идентифицируй людей.`,
      },
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text" as const,
            text: multiView
              ? `Проанализируй осанку по ${photos.length} фотографиям с разных ракурсов (${photoDescriptions}) и дай комплексную оценку на русском языке.`
              : "Проанализируй осанку на этом фото и дай структурированную оценку на русском языке.",
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

  let result: PostureResult;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : content) as PostureResult;
  } catch {
    res.status(400).json({ error: "Не удалось разобрать ответ ИИ" });
    return;
  }

  if (typeof result.overallScore !== "number" || !result.areas || !result.recommendations) {
    res.status(400).json({ error: "Некорректный результат анализа" });
    return;
  }

  res.json(result);
});

export default router;
