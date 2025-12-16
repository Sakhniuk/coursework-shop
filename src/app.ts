import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./db";
import { productsRouter } from "./routes/products.routes";

const app = express();

// products routes
app.use("/products", productsRouter);

app.use(express.json());

// health-check + перевірка БД
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "DB_CONNECTION_FAILED" });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});