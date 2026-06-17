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
  const userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;

  if (userId) {
    (req as any).userId = userId;
  }
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

export default app;