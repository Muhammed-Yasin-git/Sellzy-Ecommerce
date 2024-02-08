const productdb = require("../model/productsmodel");
const categorydb = require("../model/categorymodel");
const cartDb = require("../model/cartmodel");

exports.admincategory = (req, res) => {
  categorydb.find({ active: true }).then((data) => {
    // console.log(data);

    res.render("admincategory", { category: data });
  });
};

exports.singlecategory = (req, res) => {
  const categories = req.query.category;
  productdb.find({ category: categories, active: true }).then((data) => {
    console.log(data);
    res.render("singlecategory", { products: data });
  });
};

exports.deletecategory = (req, res) => {
  const categories = req.query.category;

  categorydb
    .deleteOne({ name: categories })
    .then((data) => {
      console.log(data);
      res.redirect("/admin-category");
    })
    .catch((err) => {
      res.send(err);
    });
};

exports.unlistcategory = (req, res) => {
  const categories = req.query.category;
  console.log(categories);

  // Update catStatus to false in cartDb
  cartDb
    .updateMany({ category: categories }, { $set: { catStatus: false } })
    .then((cartUpdateResult) => {
      console.log("Cart Update Result:", cartUpdateResult);

      // Update category status in productdb
      return productdb.updateMany(
        { category: categories },
        { $set: { catStatus: false } }
      );
    })
    .then((productUpdateResult) => {
      console.log("Product Update Result:", productUpdateResult);

      // Update active status in categorydb
      return categorydb.updateOne(
        { name: categories },
        { $set: { active: false } }
      );
    })
    .then((categoryUpdateResult) => {
      console.log("Category Update Result:", categoryUpdateResult);

      res.redirect("/admin-category");
    })
    .catch((error) => {
      console.error("Error:", error);
      res.status(500).send("Internal Server Error");
    });
};

exports.addcategory = (req, res) => {
  const categoryName = req.body.categoryName;

  // Check if the input is only spaces or an empty string
  if (!categoryName.trim()) {
    return res
      .status(400)
      .send("Category name cannot be empty or contain only spaces");
  }

  // Check if the category already exists
  categorydb
    .findOne({ name: categoryName })
    .then((existingCategory) => {
      if (existingCategory) {
        // Category already exists, you can handle this case (e.g., send an error response)
        return res.status(400).send("Category already exists");
      }

      // Category does not exist, proceed to add it
      const category = new categorydb({
        name: categoryName,
      });

      category
        .save()
        .then((data) => {
          res.redirect("/admin-category");
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Internal Server Error");
        });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
};
exports.unlistedcategory = (req, res) => {
  categorydb.find({ active: false }).then((data) => {
    res.render("unlistedcategory", { category: data });
  });
};

exports.restorecategory = (req, res) => {
  const categories = req.query.category;
  console.log(categories + "hello");

  // Update catStatus to true in cartDb
  cartDb
    .updateMany({ category: categories }, { $set: { catStatus: true } })
    .then(() => {
      // Update category status in productdb
      return productdb.updateMany(
        { category: categories },
        { $set: { catStatus: true } }
      );
    })
    .then(() => {
      // Update active status in categorydb
      return categorydb.updateOne(
        { name: categories },
        { $set: { active: true } }
      );
    })
    .then(() => {
      res.redirect("/admin-category");
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
};
