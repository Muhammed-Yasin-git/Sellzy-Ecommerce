const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userName: {
    type: String,
  },
  products: {
    type: Array,
  },
  price: {
    type: Number,
  },

  email: {
    type: String,
  },
  shippingAddress: {
    Address: {
      type: String,
      required: true,
    },
    City: {
      type: String,
    },
    House_No: {
      type: Number,
    },
    postalcode: {
      type: Number,
    },
    AlternateNumber: {
      type: Number,
    },
  },

  status: {
    type: String,
    default: "pending",
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  PaymentMethod: {
    type: String,
    required: true,
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
