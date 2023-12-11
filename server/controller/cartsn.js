exports.cart = (req, res) => {
    const email = req.query.email;
    cartDb.find({email:email}).then(cartData => {
  
      const productIds = cartData.map(item => item.prId);
  
      productDb.find({ _id: { $in: productIds } })
        .then(data => {
          console.log(data)
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            cartDb.findOne({prId:data[i]._id})
            .then(data1=>{
              const discount=data[i].discount
              const disPrice=data[i].price * discount/100
              const showPrice1=data[i].price-disPrice
              const count=showPrice1*data1.cartQhantity
              sum = sum + count
  
            })
           
  
          }
          wishdb.find({email:email})
          .then(wishdata=>{
            console.log(data) 
            cartDb.find({email:email})
            .then(cartData=>{
              categoryDb.find({status:true})
              .then(catData=>{
                const productQhuantity = cartData.map(item => item.cartQhantity);
                res.render("cart", { cartItems: cartData, totalPrice: sum, email: email,wishdata:wishdata,catogories:catData})
              })
            })
            
          })
   
        })
        .catch(err => {
          console.error('Error:', err);  
          res.status(500).send('Internal Server Error');
        });
    }).catch(err => {
      console.error('Error:', err);  
      res.status(500).send('Internal Server Error');
    });
  };