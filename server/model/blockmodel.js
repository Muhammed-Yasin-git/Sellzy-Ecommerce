const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
  },
});

const blockDb = mongoose.model("blockdb", Schema);

module.exports = blockDb;
