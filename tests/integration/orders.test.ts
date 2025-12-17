import request from "supertest";
import express from "express";
import { prisma } from "../../src/db";
import { ordersRouter } from "../../src/routes/orders.routes";

const app = express();
app.use(express.json());
app.use("/orders", ordersRouter);

describe("Orders API", () => {
  let userId: number;
  let productId: number;

  beforeAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: "orders@test.com",
        passwordHash: "hash"
      }
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Orders category" }
    });

    const product = await prisma.product.create({
      data: {
        name: "Test product",
        sku: "TEST-ORDER-1",
        price: "100",
        stock: 10,
        categoryId: category.id
      }
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /orders → create order", async () => {
    const res = await request(app)
      .post("/orders")
      .send({
        userId,
        items: [{ productId, quantity: 2 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.items.length).toBe(1);
  });

  it("GET /orders/by-user/:userId → list orders", async () => {
    const res = await request(app).get(`/orders/by-user/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("PATCH /orders/status → update order status", async () => {
    const order = await prisma.order.findFirst({ where: { userId } });

    const res = await request(app)
      .patch("/orders/status")
      .send({
        orderId: order!.id,
        newStatus: "PAID",
        expectedVersion: order!.version
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PAID");
  });
});
