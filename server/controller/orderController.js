const cartDb = require("../model/cartmodel")
const orderDb=require("../model/ordermodel")
const productdb = require("../model/productsmodel")



exports.submitOrder=(req,res)=>{
    const id = req.query.prId;

    if (id) {
        productdb.findOne({ _id: id })
            .then(data => {
                console.log("Original price:", data.price);
                console.log("Discount:", data.discount);
    
                const Price = data.price - (data.price * (data.discount / 100));
                console.log("Calculated Price:", Price);
    
                const NewOrder = new orderDb({
                    email: req.session.email,
                    userName: req.body.userName,
                    products: data,
                    price: Price, // Use the Price variable here
                    shippingAddress: {
                        Address: req.body.Address,
                        City: req.body.City,
                        House_No: req.body.House_No,
                        postalcode: req.body.postalcode,
                        AlternateNumber: req.body.altr_number
                    },
                    PaymentMethod: req.body.payment
                });
    
                NewOrder.save()
                    .then(data1 => {
                        productdb.updateOne({ _id: id }, { $inc: { stock: -1 } })
                            .then(dpr => {
                                res.render("orderSuccess", { orderId: data1._id });
                            })
                            .catch(err => {
                                console.error("Error updating stock:", err);
                                res.send(err);
                            });
                    })
                    .catch(err => {
                        console.error("Error saving order:", err);
                        res.send(err);
                    });
            })
            .catch(err => {
                console.error("Error finding product:", err);
                res.send(err);
            });
    
        return;
    }
    
    const cartEmail = req.session.email;

    cartDb.find({ email: cartEmail })
    .then(prdata => {
        const orderPromises = prdata.map(product => {
            return productdb.findOne({ _id: product.prId })
                .then(data => {
                    const discountedPrice = data.price - (data.price * (data.discount / 100));

                    const NewOrder = new orderDb({
                        email: cartEmail,
                        userName: req.body.userName,
                        products: data,
                        price: discountedPrice, // Assign discounted price here
                        shippingAddress: {
                            Address: req.body.Address,
                            City: req.body.City,
                            House_no: req.body.House_No,
                            postcode: req.body.postalcode,
                            AlternateNumber: req.body.altr_number
                        },
                        PaymentMethod: req.body.payment
                    });

                    return NewOrder.save().then(data1 => {
                        const quantity = Number(product.cartQuantity);
                        return productdb.updateMany({ _id: product.prId }, { $inc: { stock: -quantity } })
                            .then(() => data1._id);
                    });
                });
        });

        Promise.all(orderPromises)
            .then(orderIds => {
                cartDb.deleteMany({ email: cartEmail })
                    .then(() => {
                        res.render("orderSuccess", { orderId: orderIds });
                    })
                    .catch(err => {
                        res.send(err);
                    });
            })
            .catch(err => {
                res.send(err);
            });
    })
    .catch(err => {
        res.send(err);
    });
}



exports.changeStatus = (req, res) => {
    const id = req.query.id;
    const newStatus = req.body.exampleRadios; 

    orderDb.updateOne({ _id: id }, { $set: { status: newStatus } })
        .then(result => {
            res.redirect("/admin-order"); 
        })
        .catch(err => {
            res.status(500).send(err); 
        });
};

exports.cancel = (req, res) => {
    const orderId = req.query.id;
    orderDb.updateOne({ _id: orderId }, { $set: { status: 'Cancelled' } })
        .then(() => {
            orderDb.findOne({_id:orderId})
            .then(data=>{
              productdb.updateOne({_id:data.products._id},{$inc:{stock:1}})
              .then(udata=>{
                res.redirect("/your-orders");
              })

            })
          
        })
        .catch(err => {
            console.log("Error in catch block:", err);
            res.send(err);
        });
};
exports.return = (req, res) => {
    const orderId = req.query.id;
    orderDb.updateOne({ _id: orderId }, { $set: { status: 'Returned' } })
        .then(() => {
            orderDb.findOne({_id:orderId})
            .then(data=>{
              productdb.updateOne({_id:data.products._id},{$inc:{stock:1}})
              .then(udata=>{
                res.redirect("/your-orders");
              })

            })
          
        })
        .catch(err => {
            console.log("Error in catch block:", err);
            res.send(err);
        });
};


