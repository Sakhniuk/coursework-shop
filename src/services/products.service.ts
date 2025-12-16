import { prisma } from "../db";
import { z } from "zod";

const CreateProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(3),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  categoryId: z.number().int().positive()
});

export async function createProductWithPriceHistory(input: unknown) {
  const data = CreateProductSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        price: data.price as any,
        stock: data.stock,
        categoryId: data.categoryId
      }
    });

    await tx.productPriceHistory.create({
      data: {
        productId: product.id,
        oldPrice: data.price as any,
        newPrice: data.price as any
      }
    });

    return product;
  });
}

const UpdatePriceSchema = z.object({
  productId: z.number().int().positive(),
  newPrice: z.number().positive(),
  expectedVersion: z.number().int().nonnegative()
});

export async function updateProductPriceOptimistic(input: unknown) {
  const data = UpdatePriceSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({ where: { id: data.productId } });
    if (!current) throw new Error("PRODUCT_NOT_FOUND");
    if (current.deletedAt) throw new Error("PRODUCT_DELETED");

    const updated = await tx.product.updateMany({
      where: { id: data.productId, version: data.expectedVersion },
      data: { price: data.newPrice as any, version: { increment: 1 } }
    });

    if (updated.count === 0) throw new Error("CONCURRENT_UPDATE");

    await tx.productPriceHistory.create({
      data: {
        productId: data.productId,
        oldPrice: current.price,
        newPrice: data.newPrice as any
      }
    });

    return tx.product.findUnique({ where: { id: data.productId } });
  });
}


export async function softDeleteProduct(productId: number) {
  return prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date(), isActive: false, version: { increment: 1 } }
  });
}


export async function listProducts(categoryId?: number, take = 20, skip = 0) {
  return prisma.product.findMany({
    where: { deletedAt: null, isActive: true, ...(categoryId ? { categoryId } : {}) },
    orderBy: { price: "desc" },
    take,
    skip
  });
}


export async function searchProducts(q: string) {
  return prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } }
      ]
    },
    take: 20
  });
}


export async function topProductsByCategory() {
  return prisma.$queryRawUnsafe(`
    WITH product_sales AS (
      SELECT
        c.name AS category,
        p.id AS product_id,
        p.name AS product_name,
        SUM(oi.quantity * oi."unitPrice") AS revenue,
        ROW_NUMBER() OVER (
          PARTITION BY c.id ORDER BY SUM(oi.quantity * oi."unitPrice") DESC
        ) AS rank_in_category
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE o.status = 'COMPLETED'
      GROUP BY c.id, c.name, p.id, p.name
    )
    SELECT * FROM product_sales
    WHERE rank_in_category <= 3
    ORDER BY category, revenue DESC;
  `);
}
