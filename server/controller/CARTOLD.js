MyCart: async (req, res) => {
    try {
      const email = req.session.email;
      console.log(email + " this is from Mycart");
  
      const cartData = await cartDb.find({ email: email });
      const productId = cartData.map((item) => item.prId);
  
      const productData = await productdb.find({ _id: { $in: productId } });
  
      let sum = 0;
      let totalDiscount = 0;
      let totalsumWithoutDiscount = 0;
  
      const updateOperations = [];
  
      for (let i = 0; i < productData.length; i++) {
        const cartItem = await cartDb.findOne({ prId: productData[i]._id });
  
        // Update the product price and stock in the cartDb for each item
        const updateOperation = cartDb.updateOne(
          { email: email, prId: productData[i]._id },
          { $set: { price: productData[i].price, stock: productData[i].stock } },
          { upsert: true }
        );
  
        updateOperations.push(updateOperation);
  
        const discount = productData[i].discount;
        const disPrice = productData[i].price * discount / 100;
        const showPrice1 = productData[i].price - disPrice;
        const count = Math.floor(showPrice1 * cartItem.cartQuantity);
  
        // Accumulate the sum inside the loop
        sum += count;
  
        // Accumulate the total discount inside the loop
        totalDiscount += (productData[i].price * (productData[i].discount / 100) * cartItem.cartQuantity);
  
        // Accumulate the total price without discount inside the loop
        totalsumWithoutDiscount += (productData[i].price * cartItem.cartQuantity);
      }
  
      // Wait for all update operations to complete before rendering the page
      await Promise.all(updateOperations);
  
      // Introduce a delay (e.g., 100 milliseconds) before rendering
  
      // Rendering inside the Promise.all block
      res.render("cart", {
        cart: cartData,
        totalsum: sum,
        totalDiscount: totalDiscount,
        totalsumWithoutDiscount: totalsumWithoutDiscount,
        email: email
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }