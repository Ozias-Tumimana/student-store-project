const prisma = require('../src/db/db')

class Order {
  static async list({ customer } = {}) {
    const where = customer ? { customer } : undefined
    return prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { product: true } } },
    })
  }

  // Create an order and its items in one transaction. Prices come from the
  // current product prices, not the client. If a productId doesn't exist the
  // whole thing rolls back.
  static async create({ customer, status, items }) {
    return prisma.$transaction(async (tx) => {
      const productIds = items.map((i) => i.productId)
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      })
      const priceById = new Map(products.map((p) => [p.id, p.price]))

      for (const item of items) {
        if (!priceById.has(item.productId)) {
          const err = new Error(`Product with id ${item.productId} not found`)
          err.code = 'PRODUCT_NOT_FOUND'
          err.missingId = item.productId
          throw err
        }
      }

      let totalPrice = 0
      const itemData = items.map((item) => {
        const unitPrice = priceById.get(item.productId)
        totalPrice += unitPrice * item.quantity
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: unitPrice,
        }
      })
      totalPrice = Math.round(totalPrice * 100) / 100

      return tx.order.create({
        data: {
          customer,
          status: status ?? 'pending',
          totalPrice,
          orderItems: { create: itemData },
        },
        include: { orderItems: true },
      })
    })
  }

  static async update(id, data) {
    return prisma.order.update({
      where: { id },
      data,
      include: { orderItems: true },
    })
  }

  static async delete(id) {
    return prisma.order.delete({ where: { id } })
  }
}

module.exports = Order
