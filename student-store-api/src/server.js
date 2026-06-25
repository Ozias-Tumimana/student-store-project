require('dotenv').config()

const express = require('express')
const cors = require('cors')
const Product = require('../models/product')
const Order = require('../models/order')
const OrderItem = require('../models/orderItem')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Student Store API is running 🎓' })
})

// Product routes

app.get('/products', async (req, res) => {
  const { category, sort } = req.query
  try {
    const products = await Product.list({ category, sort })
    res.status(200).json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

app.get('/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  try {
    const product = await Product.getById(id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.status(200).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

app.post('/products', async (req, res) => {
  const { name, description, price, imageUrl, category } = req.body
  for (const field of ['name', 'description', 'price', 'category']) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      return res.status(400).json({ error: `Missing required field: ${field}` })
    }
  }
  try {
    const product = await Product.create({ name, description, price, imageUrl, category })
    res.status(201).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

app.put('/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  const { name, description, price, imageUrl, category } = req.body
  const data = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (price !== undefined) data.price = price
  if (imageUrl !== undefined) data.imageUrl = imageUrl
  if (category !== undefined) data.category = category

  try {
    const product = await Product.update(id, data)
    res.status(200).json(product)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

app.delete('/products/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' })
  }
  try {
    const product = await Product.delete(id)
    res.status(200).json({ message: 'Product deleted', product })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// Order routes

app.get('/orders', async (req, res) => {
  const { customer } = req.query
  try {
    const orders = await Order.list({ customer })
    res.status(200).json(orders)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

app.get('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  try {
    const order = await Order.getById(id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.status(200).json(order)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

app.post('/orders', async (req, res) => {
  const { customer, status, items } = req.body

  if (!customer || typeof customer !== 'string') {
    return res.status(400).json({ error: 'customer is required' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' })
  }
  for (const item of items) {
    if (!Number.isInteger(item?.productId) || !Number.isInteger(item?.quantity) || item.quantity < 1) {
      return res.status(400).json({
        error: 'Each item must have an integer productId and a quantity of at least 1',
      })
    }
  }

  try {
    const order = await Order.create({ customer, status, items })
    res.status(201).json(order)
  } catch (err) {
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

app.put('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  const { status, customer } = req.body
  const data = {}
  if (status !== undefined) data.status = status
  if (customer !== undefined) data.customer = customer

  try {
    const order = await Order.update(id, data)
    res.status(200).json(order)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to update order' })
  }
})

app.delete('/orders/:order_id', async (req, res) => {
  const id = Number(req.params.order_id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  try {
    const order = await Order.delete(id)
    res.status(200).json({ message: 'Order deleted', order })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to delete order' })
  }
})

// Order item routes

app.get('/order-items', async (req, res) => {
  try {
    const items = await OrderItem.list()
    res.status(200).json(items)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch order items' })
  }
})

app.post('/orders/:order_id/items', async (req, res) => {
  const orderId = Number(req.params.order_id)
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' })
  }
  const { productId, quantity } = req.body
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      error: 'Item must have an integer productId and a quantity of at least 1',
    })
  }
  try {
    const item = await OrderItem.create({ orderId, productId, quantity })
    res.status(201).json(item)
  } catch (err) {
    if (err.code === 'ORDER_NOT_FOUND' || err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: err.message })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to add order item' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Student Store API listening on http://localhost:${PORT}`)
})

module.exports = app
