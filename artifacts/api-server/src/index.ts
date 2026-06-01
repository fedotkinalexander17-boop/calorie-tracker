import app from "./app";
import { logger } from "./lib/logger";
import { seedFoodsIfEmpty } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ➕ ДОБАВЛЯЕМ КОРНЕВОЙ МАРШРУТ
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Calorie Tracker API is running! 🚀',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      analyze: '/analyze-food',
      dashboard: '/dashboard',
      foods: '/foods',
      meals: '/meals',
      goals: '/goals',
      wellness: '/wellness'
    }
  });
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  seedFoodsIfEmpty().catch((e) => {
    logger.error({ err: e }, "Failed to seed foods");
  });
});
