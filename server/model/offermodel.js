const mongoose = require("mongoose");

// Define the product schema
const schema = new mongoose.Schema({
  pname: {
    type: String,
  },
  category: {
    type: String,
  },
  discount: {
    type: Number,
    required: true,
  },
  expiredate: {
    type: Date,
    required: true,
  },
});

// Create a mongoose model using the product schema
const Offer = mongoose.model("Offer", schema);

// Export the Product model
module.exports = Offer;
