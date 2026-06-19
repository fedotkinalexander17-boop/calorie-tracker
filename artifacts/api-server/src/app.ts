import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import "./types/express.d";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(clerkMiddleware());

// Middleware для получения userId из Clerk
app.use((req, res, next) => {
  const auth = getAuth(req);
  console.log("🔍 Auth from Clerk:", auth ? "authenticated" : "no auth");
  
  let userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
  
  // ВРЕМЕННАЯ ЗАГЛУШКА: если userId не найден, используем тестовый
  if (!userId) {
    console.log("⚠️ No userId found, using test user");
    userId = 'test-user-id';
  } else {
    console.log("✅ userId set:", userId);
  }
  
  (req as any).userId = userId;
  next();
});

// app.use("/api", router); // временно отключаем

// ============================================
// API FOODS
// ============================================
app.get('/api/foods', async (req, res) => {
  try {
    const search = req.query.search as string || '';
    console.log("🔥 /api/foods called with search:", search);

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    console.log("✅ Foods data returned:", data?.length || 0, "items");
    res.json(data || []);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API MEALS
// ============================================

// Получить приёмы пищи за день
app.get('/api/meals', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    const mealType = req.query.mealType as string;
    
    console.log("🔍 GET /api/meals - userId:", userId, "date:", date, "mealType:", mealType);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    console.log("💾 POST /api/meals - userId:", userId, "meal_type:", meal_type, "foods:", foods?.length, "date:", date);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!meal_type || !foods || !date) {
      return res.status(400).json({ error: 'meal_type, foods, and date are required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    console.log("✅ Meal saved:", data);
    res.json(data);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// API DASHBOARD
// ============================================

// Daily Summary
app.get('/api/daily-summary', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    console.log("📊 GET /api/daily-summary - userId:", userId, "date:", date);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    console.log("✅ Daily summary:", summary);
    res.json(summary);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Weekly Stats
app.get('/api/weekly-stats', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    console.log("📊 GET /api/weekly-stats - userId:", userId, "date:", date);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    const result = Object.entries(dailyData).map(([date, data]) => ({
      date,
      totalCalories: data.totalCalories,
      goalCalories: data.goalCalories,
    }));
    
    console.log("✅ Weekly stats:", result);
    res.json(result);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recent Meals
app.get('/api/recent-meals', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 5;
    
    console.log("📊 GET /api/recent-meals - userId:", userId, "limit:", limit);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: meals, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log("✅ Recent meals:", meals?.length || 0);
    res.json(meals || []);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Meal Type Breakdown
app.get('/api/meal-breakdown', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const date = req.query.date as string;
    
    console.log("📊 GET /api/meal-breakdown - userId:", userId, "date:", date);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    const result = Object.values(breakdown);
    console.log("✅ Meal breakdown:", result);
    res.json(result);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default app;