import { Router } from "express";
import { createOrderWithItems } from "../services/orders.service";

export const ordersRouter = Router();

ordersRouter.post("/", async (req, res) => {
  try {
    const order = await createOrderWithItems(req.body);
    res.status(201).json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});