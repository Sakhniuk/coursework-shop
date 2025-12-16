import { Router } from "express";
import { prisma } from "../db";
import { listUsers, customerLTV } from "../services/orders.service";

export const usersRouter = Router();

usersRouter.get("/", async (req, res) => {
  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);

  res.json(await listUsers(take, skip));
});

usersRouter.get("/analytics/ltv", async (_req, res) => {
  res.json(await customerLTV());
});

usersRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false }
  });
  res.json(user);
});