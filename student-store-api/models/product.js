const prisma = require('../src/db/db')

class Product {
  static async list({ category, sort } = {}) {
    const where = category ? { category } : undefined

    let orderBy
    if (sort === 'price') orderBy = { price: 'asc' }
    else if (sort === 'name') orderBy = { name: 'asc' }

    return prisma.product.findMany({ where, orderBy })
  }

  static async getById(id) {
    return prisma.product.findUnique({ where: { id } })
  }

  static async create({ name, description, price, imageUrl, category }) {
    return prisma.product.create({
      data: { name, description, price, imageUrl, category },
    })
  }

  static async update(id, data) {
    return prisma.product.update({ where: { id }, data })
  }

  static async delete(id) {
    return prisma.product.delete({ where: { id } })
  }
}

module.exports = Product
