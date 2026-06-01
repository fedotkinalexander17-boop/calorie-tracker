import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { AnalyzeFoodImageBody, AnalyzeFoodImageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/analyze-food-image", async (req, res): Promise<void> => {
  const parsed = AnalyzeFoodImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are a nutrition expert. When given a food photo, analyze it and estimate the nutritional content. Always respond with a valid JSON object and nothing else. The JSON must match exactly this structure:
{
  "foodName": "string (name of the food or dish)",
  "servingSize": "string (estimated serving size, e.g. '1 plate ~350g')",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "confidence": "high" | "medium" | "low",
  "notes": "string (brief note about the estimate, e.g. ingredients identified, assumptions made)"
}
Be conservative with estimates. If the image is not food, set confidence to "low" and estimate 0 for all nutrients with a note explaining.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
          {
            type: "text",
            text: "Please analyze this food and provide nutritional estimates per serving shown in the image.",
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    res.status(400).json({ error: "No response from AI" });
    return;
  }

  let parsed2: unknown;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed2 = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    res.status(400).json({ error: "Failed to parse AI response" });
    return;
  }

  const validated = AnalyzeFoodImageResponse.safeParse(parsed2);
  if (!validated.success) {
    res.status(400).json({ error: "Invalid analysis result from AI" });
    return;
  }

  res.json(validated.data);
});

export default router;
