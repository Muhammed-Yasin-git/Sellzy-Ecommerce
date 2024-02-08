const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    pname:{
        type:String
    },
    prd_image:{
        type:[String]
    },
    category:{
        type:String
    },
    description:{
        type:String
    },
    additional_info:{
        type:String
    },
    price:{
        type:Number
    },
    discount:{
        type:Number
    },
    totalPrice:{
        type:Number
    },
    purchase:{
        type:String
    },
    reviews:{
        type:[{
            feedback:String,
            rating:Number
        }]
    },
    stock:{
        type:Number,
        default:0
    },
    unlist: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        default: 'pending',
      },
    catStatus: {
        type: Boolean,
        default: true
    },
    offer: {
        type: mongoose.Types.ObjectId,
        default: null,
        ref: 'Offer'
    },
    active:{
        type:String,
        default:true
    },
})

const productDb = mongoose.model('productdb',schema);

module.exports = productDb