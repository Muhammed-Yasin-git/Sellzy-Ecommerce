const categoryDb = require("../model/categorymodel");
const productDb = require("../model/productsmodel");
const offerDb = require("../model/offermodel");

exports.addOffer = (req, res) => {
  categoryDb.find({ active: true }).then((data) => {
    console.log(data);
    res.render("addOffer", { category: data });
  });
};
exports.addProductOffer = (req, res) => {
  productDb.find({ active: true })
    .then((data) => {
      console.log(data);
      res.render("addProductOffer", { products: data });
    })
    .catch((err) => {
      res.status(500);
    });
};

exports.saveOffer = async (req, res) => {
  try {
    console.log(req.body);
    const { category, discount, expiredDate } = req.body;
    let data = new offerDb({
      category: category,
      discount: discount,
      expiredate: expiredDate,
    });

    await data.save();

    const offerId = data._id;
    console.log("sha", offerId);

    if (data.category == "all") {
      console.log("alllllllllllllll");
      const d = await productDb.updateMany({}, { $set: { offer: data._id } });
      console.log(d);
    } else {
      console.log("fghjdfghj");
      await productDb.updateMany(
        { category: data.category },
        { $set: { offer: data._id } }
      );
    }
    res.redirect("/admin-offers");
  } catch (err) {
    res.status(500);
  }
};

exports.ProductOffer = async (req, res) => {
  try {
    console.log(req.body);
    const { products, discount, expiredDate } = req.body;

    let data = new offerDb({
      pname: products,
      discount: discount,
      expiredate: expiredDate,
    });

    await data.save();

    const offerId = data._id;
    console.log("shaha", offerId);

    const d = await productDb.updateMany(
      { pname: data.pname },
      { $set: { offer: data._id } }
    );
    console.log(d);
    res.redirect("/admin-offers");
  } catch (err) {
    res.status(500);
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const id = req.query.id;

    await offerDb.deleteOne({ _id: id });

    await productDb.updateMany({ offers: id }, { $unset: { offer: 1 } });

    res.redirect("/admin-offers");
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};
