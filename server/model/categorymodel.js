const mongoose = require("mongoose");

// Define the product schema
const categorySchema = new mongoose.Schema({
  name: String,
  active: {
    type: Boolean,
    default: true,
  },
});
// Create a mongoose model using the product schema
const categories = mongoose.model("categories", categorySchema);

// Export the Product model
module.exports = categories;
