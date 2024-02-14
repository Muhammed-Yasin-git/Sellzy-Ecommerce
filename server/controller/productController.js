const productDb = require("../model/productsmodel");
const cartDb = require("../model/cartmodel");
const sharp  =require("sharp")
const path =require("path")
const fs = require("fs");

exports.findproducts = (req, res) => {
  productDb
    .find({ active: true })
    .then((products) => {
      res.send(products);
    })
    .catch((err) => {
      res.send({ message: "error while retreiving product information" });
    });
};
exports.newproduct = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No file(s) uploaded.");
    }

    const images = [];
    
    // Loop through each uploaded file
    for (const file of req.files) {
      // Generate unique filenames for the resized image and original image
      const imagePath = `resizedImg${file.filename}`;
      try {
        // Resize and process the image using Sharp, then save to file
        await sharp((path.join(__dirname, '../../images',`${file.filename}`)))
          .resize(200, 200, { fit: "cover", position: "centre" })
          .toFile(path.join(__dirname, '../../images',`resizedImg${file.filename}`));

        // Push the image path to the array
        images.push(imagePath);
      } catch (resizeError) { 
        console.error("Error resizing image:", resizeError);
        return res.status(500).json({ message: "Error resizing image", error: resizeError });
      }
    }

    // Create a new product with the processed images
    const product = new productDb({
      pname: req.body.pname,
      category: req.body.category,
      description: req.body.description,
      price: req.body.price,
      discount: req.body.discount,
      stock: req.body.stock,
      prd_image: images,
    });

    // Save the product to the database
    const data = await product.save();
    console.log("Product saved successfully:", data);

    // Redirect to admin-products page
    res.redirect("/admin-products");
  } catch (err) {
    console.error("Error saving product:", err);
    res.status(500).json({ message: "Error saving product", error: err });
  }
};


exports.updateproduct = (req, res) => {
  const id = req.body.productId;

  productDb
    .updateOne(
      { _id: id },
      {
        $set: {
          pname: req.body.productName,
          description: req.body.description,
          category: req.body.category,
          price: req.body.price,
          discount: req.body.discount,
          stock: req.body.stock,
        },
      }
    )
    .then((data) => {
      // Step 1: Update stock in productDb, now update stock in cartDb

      // Step 2: Find cart data based on the provided product ID
      cartDb
        .updateMany(
          { prId: id },
          {
            $set: {
              pname: req.body.productName,
              description: req.body.description,
              price: req.body.price,
              category: req.body.category,
              stock: req.body.stock,
            },
          }
        )
        .then((cartUpdateData) => {
          // Step 3: Redirect to the admin-products page or handle success as needed
          res.send(
            "<script>alert('Data updated successfully!'); window.location='/admin-products';</script>"
          );
        })
        .catch((cartUpdateErr) => {
          res.send(cartUpdateErr);
        });
    })
    .catch((err) => {
      res.send(err);
    });
};

exports.uploadimage = async (req, res) => {
  const id = req.query.id;
  const images = req.files.map((file) => file.filename);
  productDb
    .updateOne({ _id: id }, { $push: { prd_image: { $each: images } } })
    .then(() => {
      res.redirect("/admin-products");
    })
    .catch((err) => {
      res.send(err);
    });
};

exports.deleteImage = (req, res) => {
  const productId = req.query.id;
  const imageName = req.query.img;

  if (!productId || !imageName) {
    res.status(400).send("Product ID or image name is missing");
    return;
  }

  const imagePath = `images/${imageName}`; // Remove the space at the beginning

  productDb
    .updateOne({ _id: productId }, { $pull: { prd_image: imageName } })
    .then(() => {
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).send("Error deleting image file");
          return;
        }
        res.redirect(`/update-image/?id=${productId}`);
      });
    })
    .catch((err) => {
      console.log("Error updating product:", err);
      res.status(500).send("Error updating product");
    });
};

exports.softdelete = (req, res) => {
  const productId = req.query.id;

  productDb
    .updateOne({ _id: productId }, { $set: { active: false } })
    .then((data) => {
      res.redirect("/admin-products");
    })
    .catch((err) => {
      res.send(err);
    });
};

(exports.deleteProduct = (req, res) => {
  const productId = req.query.id;

  productDb
    .findOne({ _id: productId })
    .then((data) => {
      if (!data) {
        console.error("Product not found in the database.");
        res.send("Product not found.");
        return;
      }

      const images = data.prd_images;
      const deletePromises = [];

      for (let i = 0; i < images.length; i++) {
        const imagePath = `images/${images[i]}`;
        const deletePromise = new Promise((resolve, reject) => {
          fs.unlink(imagePath, (err) => {
            if (err) {
              console.error(err);
              reject("Error deleting image file");
              return;
            }
            resolve();
          });
        });

        deletePromises.push(deletePromise);
      }

      Promise.all(deletePromises)
        .then(() => {
          return productDb.deleteOne({ _id: productId });
        })
        .then((deleteData) => {
          res.send(
            "<script>alert('Product deleted successfully!'); window.location='/unlisted-product';</script>"
          );
          console.log("Product and image files deleted successfully");
        })
        .catch((deleteErr) => {
          res.send("delete error");
        });
    })
    .catch((err) => {
      console.error("Error fetching product data:", err);
      res.send("Error fetching product data");
    });
}),
  (exports.restoreProduct = async (req, res) => {
    try {
      const id = req.query.id;
      console.log(id);

      await productDb.updateOne(
        { _id: id },
        {
          $set: {
            active: true,
          },
        }
      );

      res.redirect("/admin-products");
    } catch (err) {
      res.status(500).send({
        message:
          err.message || "Error Occurred while retrieving product information",
      });
    }
  });
