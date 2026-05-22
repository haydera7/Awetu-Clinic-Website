import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res) => {
  try {
    const items = await Inventory.find().sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new medicine to inventory
// @route   POST /api/inventory
// @access  Private
const addInventoryItem = async (req, res) => {
  try {
    const { name, category, stock, unitPrice } = req.body;

    // Generate Item ID
    const itemId = `MED-${Math.floor(10000 + Math.random() * 90000)}`;

    const status = stock <= 100 ? 'Low Stock' : 'In Stock';

    const item = await Inventory.create({
      itemId,
      name,
      category,
      stock,
      unitPrice,
      status
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update stock amount (adjusting relative quantity)
// @route   PUT /api/inventory/:id/stock
// @access  Private
const updateStock = async (req, res) => {
  try {
    const { amount } = req.body; // e.g., +50 or -20
    const { id } = req.params;

    let item;
    if (mongoose.Types.ObjectId.isValid(id)) {
      item = await Inventory.findById(id);
    }

    if (!item) {
      item = await Inventory.findOne({ itemId: id });
    }

    if (!item) return res.status(404).json({ message: 'Item not found' });

    const newStock = item.stock + amount;
    item.stock = newStock;
    item.status = newStock <= 100 ? 'Low Stock' : 'In Stock';
    if (newStock <= 0) {
      item.stock = 0;
      item.status = 'Out of Stock';
    }

    await item.save();

    // Notify Admin and Pharmacist if stock is low
    if (item.stock <= 100) {
      const io = req.app.get('io');
      if (io) {
        const message = item.stock === 0 
          ? `OUT OF STOCK ALERT: ${item.name} is completely out!` 
          : `LOW STOCK ALERT: ${item.name} has only ${item.stock} left.`;
        
        io.to('Admin').to('Pharmacist').emit('notification', {
          message,
          type: item.stock === 0 ? 'danger' : 'warning'
        });
      }
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export {
  getInventory,
  addInventoryItem,
  updateStock
};
