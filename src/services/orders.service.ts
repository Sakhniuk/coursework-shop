import { prisma } from "../db";
import { z } from "zod";

const CreateOrderSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive()
    })
  ).min(1)
});

export async function createOrderWithItems(input: unknown) {
  const data = CreateOrderSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: data.userId, deletedAt: null, isActive: true }
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    const products = await tx.product.findMany({
      where: { id: { in: data.items.map(i => i.productId) }, deletedAt: null }
    });
    if (products.length !== data.items.length) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    let total = 0;
    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }
      total += Number(product.price) * item.quantity;
    }

    const order = await tx.order.create({
      data: {
        userId: data.userId,
        status: "PENDING",
        total
      }
    });

    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId)!;

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price
        }
      });

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: item.quantity } }
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: { items: true }
    });
  });
}
export async function listUsers(take = 20, skip = 0) {
  return prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take,
    skip
  });
}
export async function customerLTV() {
  return prisma.$queryRawUnsafe(`
    SELECT
      u.id,
      u.email,
      COUNT(o.id) AS orders_count,
      SUM(o.total) AS total_spent
    FROM "User" u
    JOIN "Order" o ON o."userId" = u.id
    WHERE o.status = 'COMPLETED'
    GROUP BY u.id, u.email
    ORDER BY total_spent DESC;
  `);
}