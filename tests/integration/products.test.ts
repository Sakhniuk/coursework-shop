import request from "supertest";
import express from "express";
import { prisma } from "../../src/db";
import { productsRouter } from "../../src/routes/products.routes";

const app = express();
app.use(express.json());
app.use("/products", productsRouter);

describe("Products API", () => {
  let categoryId: number;

  beforeAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productPriceHistory.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    const category = await prisma.category.create({
      data: { name: "Electronics" }
    });

    categoryId = category.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /products → create product", async () => {
    const res = await request(app)
      .post("/products")
      .send({
        name: "Phone",
        sku: "PHONE-TEST-1",
        price: 1000,
        stock: 5,
        categoryId
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Phone");
    expect(res.body.stock).toBe(5);
  });

  it("GET /products → list products", async () => {
    const res = await request(app).get("/products");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH /products/price → update price", async () => {
    const product = await prisma.product.findFirst();
    expect(product).not.toBeNull();

    const res = await request(app)
      .patch("/products/price")
      .send({
        productId: product!.id,
        newPrice: 1200,
        expectedVersion: product!.version
      });

    expect(res.status).toBe(200);
    expect(Number(res.body.price)).toBe(1200);
  });

  it("DELETE /products/:id → soft delete", async () => {
    const product = await prisma.product.findFirst();
    expect(product).not.toBeNull();

    const res = await request(app).delete(`/products/${product!.id}`);
    expect(res.status).toBe(200);

    const deleted = await prisma.product.findUnique({
      where: { id: product!.id }
    });

    expect(deleted!.deletedAt).not.toBeNull();
  });
});
