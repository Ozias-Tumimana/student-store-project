const prisma = require('../src/db/db')

class OrderItem {
  static async list() {
    return prisma.orderItem.findMany()
  }

  static async listByOrder(orderId) {
    return prisma.orderItem.findMany({ where: { orderId } })
  }

  static async create({ orderId, productId, quantity }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      const err = new Error(`Order with id ${orderId} not found`)
      err.code = 'ORDER_NOT_FOUND'
      throw err
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      const err = new Error(`Product with id ${productId} not found`)
      err.code = 'PRODUCT_NOT_FOUND'
      throw err
    }

    return prisma.orderItem.create({
      data: { orderId, productId, quantity, price: product.price },
    })
  }
}

module.exports = OrderItem
