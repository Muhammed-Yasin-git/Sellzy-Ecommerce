const mongoose = require("mongoose");
const Schema = mongoose.Schema; // Add this line to import Schema

const addressSchema = new Schema({
  Address: String,
  City: String,
  House_No: String,
  State: String,
  altr_number: Number,
  postcode: Number,
  default: {
    type: Boolean,
    default: true,
  },
});

var schema = new Schema({
  // Use Schema here
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  block: String,
  verified: Boolean,
  status: String,
  address: [addressSchema],
  // confirmpassword:{
  //     type:String,
  //     required:true,
  // }
});

const Userdb = mongoose.model("userdb", schema);

module.exports = Userdb;
