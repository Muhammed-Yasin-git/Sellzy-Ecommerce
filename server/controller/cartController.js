const cartDb = require("../model/cartmodel");
const productdb = require("../model/productsmodel");
const categorydb = require("../model/categorymodel");
const UserDb = require("../model/usermodel");

module.exports = {
  AddToCart: (req, res) => {
    let email = req.query.email;
    let productId = req.query.id;
    let discount;
    console.log(email + "from cart session");
    productdb
      .findById(productId)
      .populate("offer")
      .then((productData) => {
        if (productData.offer !== null) {
          discount = productData.offer.discount;
        } else {
          discount = productData.discount;
        }
        console.log(discount + "hpriceeee");
        if (req.session.email) {
          console.log(productData);
          const cart = new cartDb({
            email: email,
            prId: productId,
            cartQuantity: 1,
            pname: productData.pname,
            price: productData.price,
            discount: discount,
            description: productData.description,
            stock: productData.stock,
            prd_image: productData.prd_image,
            category: productData.category,
            catStatus: productData.catStatus,
            unlist: productData.unlist,
          });

          

          cartDb.findOne({ email: email, prId: productId }).then((cartdata) => {
            if (cartdata) {
              res.redirect("/MyCart");
            } else {
              cart
                .save()
                .then(() => {
                  res.redirect("/MyCart");
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).send("Internal Server Error");
                });
            }
          });
        } else {
          // If the user is not verified, you might want to send a response here
          res.status(404).send("You need to verify the account");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error");
        console.log("catch 4");
      });
  },
  MyCart: (req, res) => {
    const email = req.session.email;

    // Initialize variables
    let sum = 0;
    let totalDiscount = 0;
    let totalsumWithoutDiscount = 0;

    // Step 1: Find cart data based on the provided email
    cartDb
      .find({ email: email })
      .then((cartData) => {
        // Step 2: Extract product IDs from cart data
        const productIds = cartData.map((item) => item.prId);

        // Step 3: Find product data based on the extracted product IDs
        productdb
          .find({ _id: { $in: productIds } })
          .populate("offer")
          .then((productData) => {
            // Step 4: Loop through the product data
            productData.forEach((product, index) => {
              // Step 5: Find cart data for the current product
              cartDb
                .findOne({ email: email, prId: product._id })
                .then((cartItem) => {
                  // Step 6: Calculate values for the current product
                  const discount =
                    product.offer !== null
                      ? product.offer.discount
                      : product.discount;
                  const disPrice = (product.price * discount) / 100;
                  const showPrice1 = product.price - disPrice;
                  const count = Math.floor(showPrice1 * cartItem.cartQuantity);
                  console.log(count);
                  console.log(disPrice);
                  console.log(showPrice1);

                  // Step 7: Accumulate the sum inside the loop
                  sum += count;
                  console.log(sum);
                  // Step 8: Accumulate the total discount inside the loop
                  totalDiscount +=
                    product.price * (discount / 100) * cartItem.cartQuantity;

                  // Step 9: Accumulate the total price without discount inside the loop
                  totalsumWithoutDiscount +=
                    product.price * cartItem.cartQuantity;
                  req.session.newPrice = sum;
                  console.log(req.session.newPrice);
                })
                .catch((err) => {
                  console.error("Error finding cart item:", err);
                  res.status(500).send("Internal Server Error");
                });
            });

            // Step 10: Find cart data again (outside the loop)
            cartDb
              .find({ email: email })
              .then((cartData) => {
                // Step 11: Find category data
                categorydb
                  .find({ active: true })
                  .then((catData) => {
                    const productData = cartData.map(
                      (item) => item.cartQuantity
                    );
                    console.log(cartData);
                    // Step 12: Render the cart page with the calculated values
                    res.render("cart", {
                      cart: cartData,
                      totalsum: sum,
                      totalDiscount: totalDiscount,
                      totalsumWithoutDiscount: totalsumWithoutDiscount,
                      email: email,
                      catogories: catData,
                    });
                  })
                  .catch((err) => {
                    console.error("Error finding category data:", err);
                    res.status(500).send(err);
                  });
              })
              .catch((err) => {
                console.error(
                  "Error finding cart data (outside the loop):",
                  err
                );
                res.status(500).send(err);
              });
          })
          .catch((err) => {
            console.error("Error finding product data:", err);
            res.status(500).send(err);
          });
      })
      .catch((err) => {
        console.error("Error finding cart data:", err);
        res.status(500).send(err);
      });
  },

  RemoveProduct: (req, res) => {
    const email = req.session.email;
    const id = req.query.id;
    cartDb.deleteOne({ email: email, prId: id }).then((data) => {
      res.redirect("/Mycart");
    });
  },
  inc: (req, res) => {
    const id = req.query.id;

    productdb
      .findOne({ _id: id })
      .then((data) => {
        const stock = data.stock;

        cartDb
          .findOne({ prId: id, email: req.session.email })
          .then((data1) => {
            if (
              data1 &&
              data1.cartQuantity < stock &&
              data1.cartQuantity < 15
            ) {
              cartDb
                .updateOne(
                  { prId: id, email: req.session.email },
                  { $inc: { cartQuantity: 1 } }
                )
                .then(() => {
                  // Respond with success
                  res.json({ success: true });
                })
                .catch((err) => {
                  console.error(err);
                  res.status(500).json({ success: false });
                });
            } else {
              // Respond with failure
              res.json({ success: false });
            }
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ success: false });
          });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false });
      });
  },

  decre: (req, res) => {
    const email = req.session.email;

    cartDb
      .findOne({ prId: req.query.id, email: email })
      .then((data) => {
        if (data && data.cartQuantity >= 2) {
          cartDb
            .updateOne(
              { prId: req.query.id, email: email },
              { $inc: { cartQuantity: -1 } }
            )
            .then(() => {
              // Respond with success
              res.json({ success: true });
            })
            .catch((err) => {
              console.error(err);
              res.status(500).json({ success: false });
            });
        } else {
          // Respond with failure
          res.json({ success: false });
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ success: false });
      });
  },

  cartUpdate: async (req, res) => {
    const id = req.query.id;
    const delta = parseInt(req.query.change);

    try {
      const cartData = await cartDb.findOne({
        prId: id,
        email: req.session.email,
      });
      const newQuantity = cartData.cartQuantity + delta;
      const stockQuantity = cartData.stock;

      if (newQuantity >= 1 && newQuantity <= stockQuantity) {
        await cartDb.updateOne(
          { prId: id, email: req.session.email },
          { $inc: { cartQuantity: delta } }
        );
        const updatedData = await cartDb.findOne({
          prId: id,
          email: req.session.email,
        });
        const data = await cartDb.find();

        const totalSum = data.reduce((total, value) => {
          const discountedPrice =
            value.price - (value.price * value.discount) / 100;
          return total + discountedPrice * value.cartQuantity;
        }, 0);

        console.log("hello", totalSum);

        req.session.newPrice = totalSum;

        res.json({ success: true, updatedData, totalSum });
      } else {
        res.json({ success: false, messege: "no cartData" });
      }
    } catch (error) {
      res.json({ success: false, messege: "try catch error" });
    }
  },
};
