import { Router } from "express";
import {
  createOrderWithItems,
  listOrdersByUser,
  updateOrderStatusOptimistic
} from "../services/orders.service";

export const ordersRouter = Router();


ordersRouter.post("/", async (req, res) => {
  try {
    const order = await createOrderWithItems(req.body);
    res.status(201).json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});


ordersRouter.get("/by-user/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  res.json(await listOrdersByUser(userId));
});


ordersRouter.patch("/status", async (req, res) => {
  try {
    const order = await updateOrderStatusOptimistic(req.body);
    res.json(order);
  } catch (e: any) {
    res.status(e.message === "CONCURRENT_UPDATE" ? 409 : 400).json({
      error: e.message
    });
  }
});
