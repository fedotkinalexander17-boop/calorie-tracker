import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
// import { clerkMiddleware, getAuth } from "@clerk/express";
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
// app.use(clerkMiddleware());

// Временная заглушка для авторизации
app.use((req, res, next) => {
  (req as any).userId = 'test-user-id';
  next();
});

app.use("/api", router);

export default app;