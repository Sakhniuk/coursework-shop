import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./db";
import { productsRouter } from "./routes/products.routes";
import { ordersRouter } from "./routes/orders.routes";

const app = express();
app.use(express.json());

app.use("/products", productsRouter);
app.use("/orders", ordersRouter);

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