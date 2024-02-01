const Userdb = require("../model/usermodel")
const productDb = require("../model/productsmodel")
const categorydb = require("../model/categorymodel")
const mongoose = require('mongoose');
const orderdb = require("../model/ordermodel")



exports.signin = (req,res)=>{
    req.session.isEmailValidate = false;
    res.render("sign_in",{isValidate:req.session.isValidate,isBlock:req.session.isBlock})
}

exports.signup = (req,res)=>{
    const email = req.session.email
    req.session.isBlock = false
    req.session.isValidate = false;
    res.render("signup",{email:email})
}
exports.otp = (req,res)=>{
    req.session.isEmailValidate = false;
    res.render("otp")
}
exports.otp1 = (req,res)=>{
    res.render("otp1")
}
exports.verify = (req,res)=>{
    
    res.render("emailverify",{isEmailValidate:req.session.isEmailValidate})
}
exports.forgot = (req,res)=>{
    res.render("forgot")
}
exports.forgot = (req,res)=>{
    res.render("forgot")
}
exports.resetpassword = (req,res)=>{
    const email = req.session.email
    res.render("resetpassword",{email:email})
}

exports.productdetails=(req,res)=>{
    const id = req.query.productId
    productDb.findOne({_id:id})
    .then(data=>{
        console.log(data);
        res.render('productdetails',{products:data,email:req.session.email})
    }).catch(err=>{
        res.send(err)
    })

    
}

exports.userdetails = (req,res)=>{
    const id = req.query.id
Userdb.find({_id:id})
    .then((userData)=>{
        console.log(userData);
        res.render("userdetails",{users:userData[0]})
    }).catch(err=>{
        console.log("accountdetails are not getting");
        res.send(err)
    })
}
exports.userhomedetails = (req, res) => {
    const id = req.query.id;
    Userdb.find({ _id: id })
        .then((userData) => {
            // console.log(userData);
            
            res.render("userhomedetails", { users: userData[0] });
        })
        .catch((err) => {
            console.log("Error retrieving user details:", err);
            res.send(err);
        });
};


exports.addAddress = (req,res)=>{
    const email = req.session.email
    Userdb.find({ email: email })
    .then(data => {
        console.log(data);
        res.render("addAddress", { email: email, users: data });
    })
    .catch(err => {
        console.log("error getting address");
        res.send(err + "internal server error");
    });
}
  


exports.userAddress = (req, res) => {
    const email = req.session.email;
    const address = req.session.address;
    const verified = req.session.verified;
    const index = req.query.id || 0;

    Userdb.find({ email: email })
        .then((userdata) => {
            console.log(address);
            const blocked = req.session.blocked;
            res.render("address", {
                users: userdata,
                verified: verified,
                blocked: blocked,
                address: address,
                email: email,
                a: index,
            });
        })
        .catch((err) => {
            res.send(err);
        });
    };


// Assuming your usermodel is imported as Userdb



exports.updateAddress = (req, res) => {
    const id = req.query.id;
    const email = req.session.email;
  
    console.log(id);
    console.log(email);
  
    Userdb.findOne({ email: email, "address._id": id })
      .then((data) => {
        if (!data || !data.address) {
          // Handle the case where no matching address is found
          res.status(404).send("Address not found");
          return;
        }
  
        // Extract the address object from the data
        const address = data.address;
        console.log(address);
  
        const addressIndex = req.query.addressIndex;

        // Render the updateAddress page and pass the address data to it
        res.render("updateAddress", { users:data , id: id, address: address ,addressIndex:addressIndex});
      })
      .catch((err) => {
        console.error("Error retrieving address:", err);
        res.status(500).send("Internal Server Error");
      });
  };



exports.editprofile = (req,res)=>{
    const id = req.query.id
    console.log(id);
    Userdb.findOne({_id:id})
    .then(data=>{
        // console.log(data+"heyyy");
        res.render("editprofile",{users:data})
    })
    
}


exports.addAddresscheckout = (req,res)=>{
    res.render("addAddressCheckout")
}



exports.checkOut = (req, res) => {
    const email = req.session.email;
    const index = req.query.id || 0;
    const prId = req.query.prId;

    // Check if there's an 'id' parameter in the query
    if (prId) {
        // If 'id' exists, retrieve the price from the product database
        productDb.findById(prId)
            .then((productData) => {
                // Assuming productData has a 'price' field
                if (productData && productData.price) {
                    const productPrice = productData.price;

                    // Calculate discounted price
                    const discountedPrice = productPrice - (productPrice * (productData.discount / 100 || 0));

                    // Retrieve user data
                    Userdb.findOne({ email: email })
                        .then(data => {
                            // Render the checkout page with product price and user data
                            res.render("checkout", {
                                prId: prId,
                                price: discountedPrice,
                                users: data,
                                a: index,
                            });
                        })
                        .catch((err) => {
                            // Handle database query error for user data
                            console.error(err);
                            res.send("Error retrieving user data.");
                        });
                } else {
                    // Handle case where productData or price is missing
                    res.send("Product data or price not found.");
                }
            })
            .catch((err) => {
                // Handle database query error for product data
                console.error(err);
                res.send("Error retrieving product data.");
            });
    } else {
        // If 'id' doesn't exist or prId is missing, use the discounted price
        Userdb.findOne({ email: email })
            .then((userdata) => {
                res.render("checkout", {
                    prId: prId,
                    users: userdata,
                    price: req.body.totalsum, // Assuming totalsum is the discounted price
                    a: index,
                });
            })
            .catch((err) => {
                // Handle database query error
                console.error(err);
                res.send("Error retrieving user data.");
            });
    }
};



  exports.yourOrders = (req, res) => {
    const email = req.session.email;
   
    
    orderdb.find({ email: email })
        .then(data => {
            console.log(data);
            res.render('yourOrders', { data: data });
        })
        .catch(error => {
            console.error(error);
            res.status(500).send('Internal Server Error');
        });
}
exports.cancelOrder = (req,res)=>{
    const id = req.query.orderId

    res.redirect(`/api/reason?id=${id}`)
}

exports.cancelReason = (req,res)=>{
    const id = req.query.id

    res.render("reason",{id:id})
    console.log(id);
}

exports.returnOrder = (req,res)=>{
    const id = req.query.orderId

    res.redirect(`/api/return/reason?id=${id}`)
}
exports.returnReason = (req,res)=>{
    const id = req.query.id

    res.render("returnReason",{id:id})
    console.log(id);
}
exports.oldPassword = (req,res)=>{
    const email = req.session.email

    

    res.render("oldpassword",{email:email,notCorrect:req.session.notCorrect})
    
}
exports.changePassword = (req,res)=>{
    const email = req.session.email

    Userdb.findOne({email:email})
    .then(user=>{
        req.session.notCorrect = false
        res.render("changePassword",{email:email})
    })


}

exports.orderdetails  =(req,res)=>{
    const userId = req.query.userId
    const orderId = req.query.orderId

    orderdb.find({_id:orderId})
    .then(data=>{
        console.log(data);
        res.render("orderDetails",{data:data})
    })

  }
exports.orderSuccess  =(req,res)=>{
   const orderId = req.query.id

    
     console.log(orderId);

    orderdb.find({_id:orderId})
    .then(data=>{
        res.render("orderSuccess",{data:data})
    })

  }
exports.paymentSuccess  =(req,res)=>{
   const orderId = req.query.id

    
     console.log(orderId);

    orderdb.find({_id:orderId})
    .then(data=>{
        res.render("orderSuccess",{data:data})
    })

  }
