const axios = require("axios")
const Userdb = require("../model/usermodel")
const fs = require('fs');
const path = require('path');
const productDb = require("../model/productsmodel")
const categorydb = require("../model/categorymodel")
const orderdb = require("../model/ordermodel")


exports.adminlogin = (req,res)=>{
    res.render("admin_login",{isAdminCheck:req.session.isAdminCheck})
}

exports.admindash = (req,res)=>{
    req.session.isAdminCheck = false;
    res.render("admin_dash")
}
exports.adminOrder = async  (req,res)=>{
    email = req.session.email

    orderdb.find()
    .then(data=>{
        // console.log(data);
        // console.log(data[data.length - 1].products);
        res.render("adminOrder",{data:data})
    })

    
}
exports.addcategory = (req,res)=>{
    res.render("addcategory")
}
exports.adminProducts = (req,res)=>{
    axios.get('http://localhost:3000/api/products')
    .then(function(product){        
        res.render('adminProduct',{products:product.data});

    })
    .catch(err=>{
        res.send(err);
    })
}

exports.addproduct = (req,res)=>{
    categorydb.find()
    .then(data=>{
        res.render("addproduct",{data:data})
    })
    
}
exports.updateproduct1 = (req,res)=>{
    const id = req.query.id
    productDb.find({_id:id})
    .then(data=>{
        categorydb.find()
    .then(catdata=>{
        console.log(data[0].pname)
        res.render("updateproduct",{products:data[0],data:catdata})
    })
        
    })
   
}


exports.deleteproduct =(req, res) => {
    const productId = req.query.id;
    productDb.findById(productId)
        .then(data => {
          console.log(data.prd_image[0] +"first log");
            const imageFile=data.prd_image[0];
            console.log(imageFile)
            const imagepath = `images/${imageFile}`;
            console.log(imagepath);
            fs.unlink(imagepath, (err) => {
                if (err) {
                    console.error(err);
                    res.send("Error deleting image file");
                    return;
                }
                productDb.deleteOne({ _id: productId })
                    .then(deleteData => {
                        res.send("<script>alert('Product deleted successfully!'); window.location='/admin-products';</script>");
                        console.log("Product and image file deleted successfully");
                    })
                    .catch(deleteErr => {
                        res.send("delete error");
                    });
            });
        })
        .catch(err => {
            res.send("Error fetching product data");
        });
  }



exports.adminusers = (req,res)=>{
    axios.get('http://localhost:3000/api/users')
    .then(function(response){
        
        res.render('adminusers',{users:response.data});

        
    })
    .catch(err=>{
        res.send(err);
    })
}


exports.userdetails = (req,res)=>{
    const id = req.query.userid
    console.log(id);

    Userdb.findOne({_id:id})
    .then(response=>{
        res.render("userdetails",{users:response})
    })
}

exports.updateimage = (req, res) => {
    const id=req.query.id
    productDb.findById(id)   
    .then(data=>{
      console.log(data)
     const image=data.prd_image   
      res.render("addimages",{images:image,id:id});
        })
    }
exports.restoreProduct = (req, res) => {
        productDb
          .find({ active: false })
          .then((products) => {
            res.render("unlistedproduct", { products: products });
          })
          .catch((err) => {
            res.status(500).send({
              message:
                err.message || "Error Occured while retriving user information",
            });
      });
};





const adminEmail = "admin123@gmail.com"
const adminPassword = "12345"

exports.isAdmin = (req, res) => {
    const { email: inputEmail, password: inputPassword } = req.body;
    if (inputEmail === adminEmail && inputPassword === adminPassword) {
        req.session.adminAuthenticated = true

        res.redirect("/admin-dash");
    } else {
        req.session.isAdminCheck = true;
      res.redirect("/admin-login");
    }
  }

  exports.yourOrders  =(req,res)=>{
    const userId = req.query.userId
    const orderId = req.query.orderId

    orderdb.find({_id:orderId})
    .then(data=>{
        res.render("orderDetails",{data:data})
    })

  }