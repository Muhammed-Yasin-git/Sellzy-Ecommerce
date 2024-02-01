const cartDb = require("../model/cartmodel");
const orderDb = require("../model/ordermodel");
const productdb = require("../model/productsmodel");
const Razorpay = require('razorpay');
const {raz_key_id,raz_key_SECRET} = process.env;

const razorpayInstance = new Razorpay({
    key_id: raz_key_id,
    key_secret: raz_key_SECRET,
  });

  exports.submitOrder = async (req, res) => {
    const id = req.query.prId;
    console.log(id);
  
    req.session.prId = id;
    try {
      if (id) {
        const data = await productdb.findOne({ _id: id });
        console.log("Original price:", data.price);
        console.log("Discount:", data.discount);
  
  
        const Price = req.session.couponApplied ? req.session.couponApplied : req.session.newPrice;
        console.log("Calculated Price:", Price);

        const NewOrder = new orderDb({
          email: req.session.email,
          userName: req.body.userName,
          products: data,
          price: Price,
          shippingAddress: {
            Address: req.body.Address,
            City: req.body.City,
            House_No: req.body.House_No,
            postalcode: req.body.postalcode,
            AlternateNumber: req.body.altr_number
          },
          PaymentMethod: req.body.payment
        });
        req.session.orderDetails = NewOrder;
  
        if (req.body.payment === "Online_Payment") {
          console.log("razorpay");
          const randomOrderID = Math.floor(Math.random() * 1000000).toString();
  
          const amount = Price * 100;
          const options = {
            amount: amount,
            currency: "INR",
            receipt: randomOrderID,
          };
  
          await new Promise((resolve, reject) => {
            razorpayInstance.orders.create(options, (err, order) => {
              console.log(err);
              if (!err) {
                console.log("Reached RazorPay Method on cntrlr", randomOrderID);
                res.status(200).json({
                  razorSuccess: true,
                  msg: "order created",
                  order_id: order.id,
                  amount: amount,
                  key_id: raz_key_id,
                  name: req.session.email,
                  contact: "8301998370",
                  email: "sellzy09@gmail.com",
                });
                resolve();
              } else {
                console.error("Razorpay Error:", err);
                res.status(400).json({
                  razorSuccess: false,
                  msg: "Error creating order with Razorpay",
                });
                reject(err);
              }
            });
          });
        } else {
          console.log("COD reached");
          const data1 = await NewOrder.save();
          await productdb.updateOne({ _id: id }, { $inc: { stock: -1 } });
  
          req.session.orderDetails = data1;
  
          console.log(req.session.orderDetails);
          const orderId = data1._id;
          if (orderId) {
            return res.json({ url: `/order-success?id=${orderId}` });
          } else {
            return res.json({ url: `/order-success` });
          }
        }
      } else {
        const cartEmail = req.session.email;
        const productData = await cartDb.find({ email: cartEmail });
        const Price = req.session.newPrice;
        console.log(Price+"hello");
  
        const allOrderDetails = [];
        for (let i = 0; i < productData.length; i++) {
          const NewOrder = {
            email: cartEmail,
            userName: req.body.userName,
            price: Price,
            shippingAddress: {
              Address: req.body.Address,
              City: req.body.City,
              House_no: req.body.House_No,
              postcode: req.body.postalcode,
              AlternateNumber: req.body.altr_number
            },
            products: productData[i],
            PaymentMethod: req.body.payment,
          };
          allOrderDetails.push(NewOrder);
        }
  
        req.session.orderDetails = allOrderDetails;
  
        if (req.body.payment === "Online_Payment") {
          const randomOrderID = Math.floor(Math.random() * 1000000).toString();

          const discountedPrice = req.session.newPrice;
  
          const amount = discountedPrice * 100;
          const options = {
            amount: amount,
            currency: "INR",
            receipt: randomOrderID,
          };
  
          await new Promise((resolve, reject) => {
            razorpayInstance.orders.create(options, (err, order) => {
              console.log(err);
              if (!err) {
                console.log("Reached RazorPay Method on cntrlr", randomOrderID);
                res.status(200).json({
                  razorSuccess: true,
                  msg: "order created",
                  order_id: order.id,
                  amount: amount,
                  key_id: raz_key_id,
                  name: req.session.email,
                  contact: "8301998370",
                  email: "sellzy09@gmail.com",
                });
                resolve();
              } else {
                console.error("Razorpay Error:", err);
                res.status(400).json({
                  razorSuccess: false,
                  msg: "Error creating order with Razorpay",
                });
                reject(err);
              }
            });
          });
        } else {
          for (let i = 0; i < allOrderDetails.length; i++) {
            const email = req.session.email;
            const neworderItem = new orderDb(allOrderDetails[i]);
  
            await neworderItem.save();
            const productId = allOrderDetails[i].products.prId;
            const quantity = allOrderDetails[i].products.cartQuantity;
            await productdb.updateOne(
              { _id: productId },
              { $inc: { stock: -quantity } }
            );
          }
  
          await cartDb.deleteMany({ email: cartEmail });
  
          return res.json({ url: `/order-success` });
        }
      }
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).send(err);
    }
  };
  




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
              productdb.updateOne({_id:data.products[0]._id},{$inc:{stock:1}})
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
              productdb.updateOne({_id:data.products[0]._id},{$inc:{stock:1}})
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

exports.paymentSuccess = async (req, res) => {
  const prId = req.session.prId;
  const orderDetails = req.session.orderDetails;
  const email = req.session.email;

  console.log("payment success");
  console.log(orderDetails);
  if (prId) {
    const neworder = new orderDb(orderDetails);
    await neworder.save();
    return res.send(`/order-success?id=${prId}`);
  } else {
    for (let i = 0; i < orderDetails.length; i++) {
      const neworder = new orderDb(orderDetails[i]);
      await neworder.save();
      const productId = orderDetails[i].products.prId;
            const quantity = orderDetails[i].products.cartQuantity;
            await productdb.updateOne(
              { _id: productId },
              { $inc: { stock: -quantity } }
            )
    }

    await cartDb.deleteMany({ email: email });

    return res.send(`/order-success`);
  }
};

   
   

  


