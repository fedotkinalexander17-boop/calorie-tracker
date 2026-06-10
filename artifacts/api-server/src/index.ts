import express, { json } from "express";
import { createClient } from '@supabase/supabase-js';
import app from "./app";
import { logger } from "./lib/logger";
import { seedFoodsIfEmpty } from "./lib/seed";

console.log("=== STARTING SERVER ===");

// Инициализация Supabase (после импортов)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log("=== IMPORTS DONE ===");

const rawPort = process.env["PORT"];
console.log("PORT from env:", rawPort);

if (!rawPort) {
  console.error("PORT environment variable is missing!");
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);
console.log("Parsed port:", port);

if (Number.isNaN(port) || port <= 0) {
  console.error("Invalid PORT value:", rawPort);
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ============================================
// КОРНЕВОЙ МАРШРУТ
// ============================================
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

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// WEBHOOK ДЛЯ CLERK (синхронизация пользователей)
// ============================================
app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = req.body;
    const eventType = payload.type;
    
    // Только события создания/обновления пользователя
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const userData = payload.data;
      
      const userId = userData.id;
      const email = userData.email_addresses?.[0]?.email_address;
      const name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || email?.split('@')[0];
      
      // Сохраняем в Supabase
      const { error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: name,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log(`User ${eventType}: ${userId}`);
      return res.status(200).json({ success: true });
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

console.log("=== BEFORE app.listen ===");

app.listen(port, (err) => {
  if (err) {
    console.error("Error in app.listen:", err);
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  console.log(`✅ Server is running on port ${port}`);
  logger.info({ port }, "Server listening");

  seedFoodsIfEmpty().catch((e) => {
    logger.error({ err: e }, "Failed to seed foods");
  });
});

console.log("=== AFTER app.listen (this may appear before server starts) ===");