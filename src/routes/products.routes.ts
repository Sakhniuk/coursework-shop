import { Router } from "express";
import {
  createProductWithPriceHistory,
  updateProductPriceOptimistic,
  softDeleteProduct,
  listProducts,
  searchProducts,
  topProductsByCategory
} from "../services/products.service";

export const productsRouter = Router();

productsRouter.post("/", async (req, res) => {
  try {
    res.status(201).json(await createProductWithPriceHistory(req.body));
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

productsRouter.patch("/price", async (req, res) => {
  try {
    res.json(await updateProductPriceOptimistic(req.body));
  } catch (e: any) {
    res.status(e.message === "CONCURRENT_UPDATE" ? 409 : 400).json({ error: e.message });
  }
});

productsRouter.delete("/:id", async (req, res) => {
  res.json(await softDeleteProduct(Number(req.params.id)));
});

productsRouter.get("/", async (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  res.json(await listProducts(categoryId));
});

productsRouter.get("/search", async (req, res) => {
  res.json(await searchProducts(String(req.query.q ?? "")));
});

productsRouter.get("/analytics/top", async (_req, res) => {
  res.json(await topProductsByCategory());
});
