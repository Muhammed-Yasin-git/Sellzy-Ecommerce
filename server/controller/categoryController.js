const productdb = require("../model/productsmodel");
const categorydb = require("../model/categorymodel");
const cartDb = require("../model/cartmodel");

exports.admincategory = (req, res) => {

  categorydb.find({ active: true }).then((data) => {
    console.log(data);
    
    res.render("admincategory", { category: data });
  });
};

exports.singlecategory = (req, res) => {
  const categories = req.query.category;
  productdb.find({ category: categories, active: true }).then((data) => {
    console.log(data);
    res.render("singleCategory", { products: data });
  });
};


exports.deletecategory = (req, res) => {
    const categories = req.query.category;
  
    categorydb.deleteOne({ name: categories }).then((data) => {
      console.log(data);
      res.redirect('/admin-category');
    }).catch(err => {
      res.send(err);
    });
  };
  

  exports.unlistcategory = (req, res) => {
    const categories = req.query.category;
    console.log(categories);
  
    // Update catStatus to false in cartDb
    cartDb.updateMany({ category: categories }, { $set: { catStatus: false } })
      .then(() => {
        // Update category status in productdb
        return productdb.updateMany({ category: categories }, { $set: { catStatus: false } });
      })
      .then(() => {
        // Update active status in categorydb
        return categorydb.updateOne({ name: categories }, { $set: { active: false } });
      })
      .then(() => {
        res.redirect("/admin-category");
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Internal Server Error");
      });
  };
  
exports.addcategory = (req, res) => {
  const category = new categorydb({
    name: req.body.categoryName,
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
};

exports.unlistedcategory = (req, res) => {
  categorydb.find({ active: false }).then((data) => {
    res.render("unlistedcategory", { category: data });
  });
};

exports.restorecategory = (req, res) => {
  const categories = req.query.category;
  console.log(categories);

  // Update catStatus to true in cartDb
  cartDb.updateMany({ category: categories }, { $set: { catStatus: true } })
    .then(() => {
      // Update category status in productdb
      return productdb.updateMany({ category: categories }, { $set: { catStatus: true } });
    })
    .then(() => {
      // Update active status in categorydb
      return categorydb.updateOne({ name: categories }, { $set: { active: true } });
    })
    .then(() => {
      res.redirect("/admin-category");
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
};
