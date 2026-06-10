import express, { json } from "express";
import { createClient } from '@supabase/supabase-js';
import app from "./app";
import { logger } from "./lib/logger";
import { seedFoodsIfEmpty } from "./lib/seed";

console.log("=== STARTING SERVER ===");

// Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables!");
  console.error("SUPABASE_URL:", supabaseUrl ? "set" : "missing");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "set" : "missing");
} else {
  console.log("Supabase initialized with URL:", supabaseUrl);
}

const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
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
    
    console.log('Webhook received:', eventType);
    
    // Только события создания/обновления пользователя
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const userData = payload.data;
      
      const userId = userData.id;
      const email = userData.email_addresses?.[0]?.email_address;
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';
      const name = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'User';
      
      console.log('Saving user to Supabase:', { userId, email, name });
      
      if (!userId || !email) {
        console.error('Missing userId or email:', { userId, email });
        return res.status(400).json({ error: 'Missing required user data' });
      }
      
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
        return res.status(500).json({ error: 'Database error', details: error.message });
      }
      
      console.log(`User ${eventType} successful: ${userId}`);
      return res.status(200).json({ success: true, userId });
    }
    
    res.status(200).json({ received: true, eventType });
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