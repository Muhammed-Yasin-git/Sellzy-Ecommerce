const couponDb = require("../model/couponmodel");

exports.coupon = (req, res) => {
  couponDb.find({ active: true }).then((data) => {
    res.render("adminCoupon", { coupon: data });
  });
};
exports.addCoupon = (req, res) => {
  res.render("addCoupon");
};

exports.saveCoupon = async (req, res) => {
  try {
    const { couponCode, discount, validFrom, validTo } = req.body;
    const code = couponCode.toUpperCase();

    const coupon = new couponDb({
      code: code,
      discountPercentage: discount,
      createdAt: validFrom,
      expirationDate: validTo,
    });
    await coupon.save();
    res.redirect("/admin-coupon");
  } catch (error) {
    console.error("Error saving coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const id = req.query.id;

    await couponDb.updateOne({ _id: id }, { $set: { active: false } });
    res.redirect("/admin-coupon");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

exports.expiredCoupon = (req, res) => {
  couponDb.find({ active: false }).then((data) => {
    res.render("deletedCoupon", { data: data });
  });
};
