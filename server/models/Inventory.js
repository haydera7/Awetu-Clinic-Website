import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true }, // e.g. MED-123
  name: { type: String, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true, default: 0 },
  unitPrice: { type: Number, required: true },
  status: { 
    type: String, 
    default: 'In Stock',
    enum: ['In Stock', 'Low Stock', 'Out of Stock']
  }
}, {
  timestamps: true
});

export default mongoose.model('Inventory', inventorySchema);
