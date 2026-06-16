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

// ============================================
// API FOODS
// ============================================

// Поиск продуктов
app.get('/api/foods', async (req, res) => {
  try {
    const search = req.query.search as string || '';
    
    let query = supabase
      .from('foods')
      .select('*')
      .order('name');
    
    if (search && search.length > 0) {
      query = query.ilike('name', `%${search}%`);
    }
    
    const { data, error } = await query.limit(20);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(data || []);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API MEALS (Приёмы пищи)
// ============================================

// Получить приёмы пищи за день
app.get('/api/meals', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    const mealType = req.query.mealType as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date);
    
    if (mealType) {
      query = query.eq('meal_type', mealType);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Если запрошен конкретный тип, возвращаем один объект
    if (mealType && data && data.length > 0) {
      return res.json(data[0]);
    }
    
    res.json(data || []);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Сохранить приём пищи
app.post('/api/meals', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { meal_type, foods, date } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!meal_type || !foods || !date) {
      return res.status(400).json({ error: 'meal_type, foods, and date are required' });
    }
    
    // Сначала удаляем существующий приём пищи за этот день и тип
    await supabase
      .from('meals')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .eq('meal_type', meal_type);
    
    // Создаём новый
    const mealData = {
      user_id: userId,
      meal_type,
      date,
      foods: foods.map((f: any) => ({
        food_id: f.food_id,
        food_name: f.food_name,
        servings: f.servings,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      })),
    };
    
    const { data, error } = await supabase
      .from('meals')
      .insert(mealData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API DAILY SUMMARY
// ============================================

app.get('/api/daily-summary', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Получаем все приёмы пищи за день
    const { data: meals, error } = await supabase
      .from('meals')
      .select('foods')
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Суммируем нутриенты
    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      goalCalories: 2000,
      goalProtein: 150,
      goalCarbs: 250,
      goalFat: 65,
    };
    
    if (meals) {
      for (const meal of meals) {
        const foods = meal.foods || [];
        for (const food of foods) {
          summary.totalCalories += food.calories || 0;
          summary.totalProtein += food.protein || 0;
          summary.totalCarbs += food.carbs || 0;
          summary.totalFat += food.fat || 0;
        }
      }
    }
    
    res.json(summary);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API WEEKLY STATS
// ============================================

app.get('/api/weekly-stats', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Вычисляем дату 7 дней назад
    const currentDate = new Date(date + 'T12:00:00');
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 6);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = date;
    
    // Получаем все приёмы пищи за неделю
    const { data: meals, error } = await supabase
      .from('meals')
      .select('date, foods')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Группируем по дням
    const dailyData: Record<string, { totalCalories: number; goalCalories: number }> = {};
    
    // Инициализируем все дни недели
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      dailyData[dStr] = { totalCalories: 0, goalCalories: 2000 };
    }
    
    if (meals) {
      for (const meal of meals) {
        const mealDate = meal.date;
        if (dailyData[mealDate]) {
          const foods = meal.foods || [];
          let totalCalories = 0;
          for (const food of foods) {
            totalCalories += food.calories || 0;
          }
          dailyData[mealDate].totalCalories += totalCalories;
        }
      }
    }
    
    // Преобразуем в массив
    const result = Object.entries(dailyData).map(([date, data]) => ({
      date,
      totalCalories: data.totalCalories,
      goalCalories: data.goalCalories,
    }));
    
    res.json(result);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API RECENT MEALS
// ============================================

app.get('/api/recent-meals', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('meals')
      .select('id, date, meal_type, foods')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Разворачиваем продукты в плоский список
    const meals = data || [];
    const result = [];
    
    for (const meal of meals) {
      const foods = meal.foods || [];
      for (const food of foods) {
        result.push({
          id: `${meal.id}_${food.food_id}`,
          meal_id: meal.id,
          meal_type: meal.meal_type,
          date: meal.date,
          foodName: food.food_name || 'Unknown',
          servings: food.servings || 1,
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
        });
      }
    }
    
    res.json(result.slice(0, limit));
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API MEAL TYPE BREAKDOWN
// ============================================

app.get('/api/meal-breakdown', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const { data: meals, error } = await supabase
      .from('meals')
      .select('meal_type, foods')
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const breakdown: Record<string, { mealType: string; totalCalories: number }> = {};
    
    if (meals) {
      for (const meal of meals) {
        const mealType = meal.meal_type || 'unknown';
        if (!breakdown[mealType]) {
          breakdown[mealType] = { mealType, totalCalories: 0 };
        }
        const foods = meal.foods || [];
        for (const food of foods) {
          breakdown[mealType].totalCalories += food.calories || 0;
        }
      }
    }
    
    res.json(Object.values(breakdown));
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

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
