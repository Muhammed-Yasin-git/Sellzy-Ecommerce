const bcrypt = require("bcrypt");
const Userdb = require("../model/usermodel");
const productDb = require("../model/productsmodel");
const couponDb = require("../model/couponmodel");
const cartDb = require("../model/cartmodel");
const categorydb = require("../model/categorymodel");
const otpdb = require("../model/otpmodel");
const blockDb = require("../model/blockmodel");
const axios = require("axios");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");

exports.create = (req, res) => {
  if (!req.body) {
    res.status(400).send({ message: "content cannot be empty" });
    return;
  }

  // Ensure that password and confirmpassword match
  if (req.body.password !== req.body.confirmpassword) {
    return res
      .status(400)
      .send({ message: "Password and Confirm Password do not match!" });
  }

  // Validate email, mobile, etc.

  // Hash the password
  bcrypt.hash(req.body.password, 10).then((hashedPassword) => {
    // Save user with hashed password
    const user = new Userdb({
      block: "false",
      userName: req.body.userName,
      email: req.body.email,
      password: hashedPassword,
      mobile: req.body.mobile,
      confirmpassword: req.body.confirmpassword,
    });

    user
      .save(user)
      .then((data) => {
        console.log(data);
        res.redirect("/signin");
      })
      .catch((err) => {
        console.error(err);
        res.redirect("/signup");
      });
  });
};

exports.find = (req, res) => {
  if (!req.body) {
    res.status(400).redirect("/signin");
    return;
  }

  const nemail = req.body.email;
  const password = req.body.password;
  req.session.testemail = req.body.email;

  Userdb.findOne({ email: nemail })
    .then((user) => {
      if (user) {
        bcrypt
          .compare(password, user.password)
          .then((isPasswordValid) => {
            if (isPasswordValid) {
              blockDb
                .find({ email: nemail })
                .then((data) => {
                  Userdb.updateOne(
                    { email: nemail },
                    { $set: { status: "Active" } }
                  )
                    .then(() => {
                      // Set email in session for future use
                      req.session.email = nemail;
                      req.session.userAuthenticated = true;
                      if (data.length !== 0) {
                        req.session.isBlock = true;
                        res.redirect("/signin");
                      } else {
                        res.redirect("/");
                      }
                    })
                    .catch((err) => {
                      console.error(err);
                      // Handle the error, if needed
                      res
                        .status(500)
                        .send({ message: "Error updating user status" });
                    });
                })
                .catch((err) => {
                  console.error(err);
                  res
                    .status(500)
                    .send({ message: "Error checking block status" });
                });
            } else {
              req.session.isValidate = true;
              res.redirect("/signin");
            }
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send({ message: "Error comparing passwords" });
          });
      } else {
        req.session.isValidate = true;
        res.redirect("/signin");
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send({ message: "Error retrieving user data" });
    });
};

exports.userHome = async (req, res) => {
  try {
    const userEmail = req.session.testemail;
    const searchQuery = req.query.search;
    const catFilter = req.query.catFilter;
    console.log("User email:", userEmail);

    const products = await productDb.find().populate("offer"); // Fetch products directly from the database

    const catData = await categorydb.find({ active: true });

    if (userEmail) {
      const userData = await Userdb.find({ email: userEmail });
      console.log("User data:", userData);
      req.session.isBlock = false;
      req.session.isValidate = false;
      res.render("user_home", {
        products,
        users: userData,
        searchQuery,
        catFilter,
        categories: catData,
      });
    } else {
      req.session.isBlock = false;
      req.session.isValidate = false;
      res.render("user_home", {
        products,
        users: null,
        searchQuery,
        catFilter,
        categories: catData,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res
      .render("user_home", {
        products: [],
        users: null,
        searchQuery,
        catFilter,
        categories: [],
        error: "Error fetching data",
      })
      .status(500);
  }
};

exports.logout = (req, res) => {
  const nemail = req.body.email;
  console.log(nemail);

  Userdb.updateOne({ email: nemail }, { $set: { status: "Inactive" } })
    .then((response) => {
      req.session.userAuthenticated = false;
      req.session.destroy((err) => {
        if (err) {
          console.error(err);
          res.send(err);
        } else {
          res.redirect("/signin");
        }
      });
    })
    .catch((err) => {
      console.error(err);
      res.send(err);
    });
};

const otpGenrator = () => {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
};

const sendOtpMail = async (req, res) => {
  const otp = otpGenrator();
  console.log(otp);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.APP_PASSWORD, // Use the App Password here
    },
  });
  // console.log(transporter);

  const MailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "SELLZY",
      link: "https://mailgen.js/",
    },
  });

  const response = {
    body: {
      name: req.session.email,
      intro: "Your OTP for SELLZY verification is:",
      table: {
        data: [
          {
            OTP: otp,
          },
        ],
      },
      outro: "Looking forward to doing more business",
    },
  };
  // console.log(req.body.email);
  const mail = MailGenerator.generate(response);

  const message = {
    from: process.env.AUTH_EMAIL,
    to: req.session.email,
    subject: "SELLZY OTP Verification",
    html: mail,
  };

  try {
    const newOtp = new otpdb({
      email: req.session.email,
      otp: otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });
    const data = await newOtp.save();
    // req.session.otpTd=data._id;
    res.status(200).redirect("/verify-otp");

    console.log("Recipient email:", req.session.email);
    await transporter.sendMail(message);
  } catch (error) {
    console.log("otp not sending");
    console.log(error);
  }
};

exports.sendOtp = async (req, res) => {
  console.log("hi");

  if (!req.body || !req.body.email) {
    console.log("not working");
    res.send("Email is required");
    return;
  }

  // Check if the user already exists
  try {
    const existingUser = await Userdb.findOne({ email: req.body.email });

    if (existingUser) {
      console.log("User already exists");
      req.session.isEmailValidate = true;
      res.redirect("/verify");
      return;
    }

    req.session.email = req.body.email;
    sendOtpMail(req, res);
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).send("Internal Server Error");
  }
};

// exports.forgotpassword = (req,res)=>{

//   if(!req.body){
//     res.send("need to filled")
//   }
//   req.session.email = req.body.email
//   sendOtpMail(req,res)
// }

exports.resendOtp = (req, res) => {
  // Ensure that the session contains an email
  if (!req.session.email) {
    return res.status(400).send("Email is required");
  }

  sendOtpMail(req, res); // Reuse the sendOtpMail function
};

exports.otpverify = (req, res) => {
  const bodyOtp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
  console.log(bodyOtp);

  otpdb
    .findOne({ otp: bodyOtp })
    .then((data) => {
      if (data && data.expiresAt > Date.now()) {
        // If OTP exists and has not expired
        req.session.isAuth = data.email; // Assuming you want to set the email in the session
        res.redirect("/signup");
      } else {
        res.send("Invalid or expired OTP");
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error verifying OTP");
    });
};
exports.otpReset = (req, res) => {
  const bodyOtp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
  console.log(bodyOtp);

  otpdb
    .findOne({ otp: bodyOtp })
    .then((data) => {
      if (data && data.expiresAt > Date.now()) {
        // If OTP exists and has not expired
        req.session.isAuth = data.email; // Assuming you want to set the email in the session
        res.redirect("/reset-password-form");
      } else {
        res.send("Invalid or expired OTP");
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Error verifying OTP");
    });
};

exports.forgotpassword = async (req, res) => {
  if (!req.body) {
    res.send("Need to be filled");
    return;
  }

  const nemail = req.body.email;

  try {
    const user = await Userdb.findOne({ email: nemail });

    if (user) {
      // Store the email in the session
      req.session.email = nemail;

      // Send OTP email
      forgotSendOtpMail(req, res, nemail);
    } else {
      res.send("User not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error finding user");
  }
};

const forgotSendOtpMail = async (req, res, nemail) => {
  const otp = otpGenrator();
  console.log(otp);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.APP_PASSWORD,
    },
  });

  const MailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "SELLZY",
      link: "https://mailgen.js/",
    },
  });

  const response = {
    body: {
      name: nemail,
      intro: "Your OTP for SELLZY verification is:",
      table: {
        data: [
          {
            OTP: otp,
          },
        ],
      },
      outro: "Looking forward to doing more business",
    },
  };

  const mail = MailGenerator.generate(response);

  const message = {
    from: process.env.AUTH_EMAIL,
    to: nemail,
    subject: "SELLZY OTP Verification",
    html: mail,
  };

  try {
    const newOtp = new otpdb({
      email: nemail,
      otp: otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });

    const data = await newOtp.save();
    res.status(200).redirect("/reset-password-otp");
    await transporter.sendMail(message);
  } catch (error) {
    console.log("OTP not sending");
    console.log(error);
    res.status(500).send("Error sending OTP");
  }
};
exports.resetpassword = async (req, res) => {
  try {
    const email = req.session.email;
    const newPassword = req.body.password;

    // console.log('Email:', email);
    // console.log('New Password:', newPassword);

    // Validate email and password
    if (!email || !newPassword) {
      return res.status(400).send("Email and password are required.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // console.log('Hashed Password:', hashedPassword);

    // Update the user's password in the database
    const response = await Userdb.updateOne(
      { email: email.trim() },
      { $set: { password: hashedPassword } }
    );

    // console.log('Update Response:', response);

    // Check if the update was successful
    if (response) {
      // Password reset successful
      console.log("Password reset successful.");
      return res.redirect("/signin");
    } else {
      // No user found with the provided email
      console.log("User not found for the provided email.");
      return res.status(404).send("User not found for the provided email.");
    }
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send("Internal Server Error");
  }
};

// userServices.js

// userController.js

exports.addAddress = async (req, res) => {
  try {
    const email = req.session.email;

    // Trim the input values and check if they are empty
    const Address = req.body.Address.trim();
    const City = req.body.City.trim();
    const HouseNo = req.body.House_No.trim();
    const State = req.body.State.trim();
    const AltrNumber = req.body.altr_number.trim();
    const Postcode = req.body.postcode.trim();

    if (!Address || !City || !HouseNo || !State || !AltrNumber || !Postcode) {
      return res
        .status(400)
        .json({ error: "Please provide valid address information." });
    }

    const newAddress = {
      Address: Address,
      City: City,
      House_No: HouseNo,
      State: State,
      altr_number: AltrNumber,
      postcode: Postcode,
      default: true,
    };

    // Set all other addresses' default property to false
    await Userdb.updateOne(
      { email: email, "address.default": true },
      { $set: { "address.$.default": false } }
    );

    // Use findOneAndUpdate to get the document before the update
    const result = await Userdb.findOneAndUpdate(
      { email: email },
      { $push: { address: newAddress } },
      { new: true } // Return the modified document
    );

    if (!result) {
      console.log("No address is added");
      return res
        .status(404)
        .json({ error: "User not found or no modifications made" });
    }

    // Access the _id from the result
    const id = result._id;

    res.redirect("/user-address");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.makeDefault = async (req, res) => {
  const email = req.session.email;
  const id = req.query.id;

  try {
    // Find the user and their addresses
    const user = await Userdb.findOne({ email: email });

    if (!user) {
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    // Iterate through the addresses and set the default flag
    user.address.forEach((address) => {
      if (address._id.toString() === id) {
        address.default = true;
      } else {
        address.default = false;
      }
    });

    // Save the updated user
    await user.save();

    // Redirect to the user account details page
    res.redirect("/user-address");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

// Assuming this is in your userController.js
exports.deleteAddress = (req, res) => {
  const email = req.session.email;
  const id = req.query.id;
  const addressIndex = req.query.addressIndex;

  Userdb.findOneAndUpdate({ email: email }, { $pull: { address: { _id: id } } })
    .then((data) => {
      // Redirect to user account details without passing the deleted address ID
      res.redirect("/user-address");
    })
    .catch((err) => {
      res.send(err);
    });
};

exports.updateAddress = (req, res) => {
  const email = req.session.email;
  const id = req.query.id;

  console.log(email, id);
  console.log("Request Body:", req.body);
  // Trim the input values and check if they are empty
  const trimmedAddress = req.body.Address.trim();
  const trimmedCity = req.body.City.trim();
  const trimmedHouseNo = req.body.House_No.trim();
  const trimmedState = req.body.State.trim();
  const trimmedAltrNumber = req.body.altr_number.trim();
  const trimmedPostcode = req.body.postcode.trim();

  if (
    !trimmedAddress ||
    !trimmedCity ||
    !trimmedHouseNo ||
    !trimmedState ||
    !trimmedAltrNumber ||
    !trimmedPostcode
  ) {
    return res.status(400).send("Please provide valid address information.");
  }

  // Extract the address fields from the request body
  // const updatedAddress = {
  //   Address: trimmedAddress,
  //   City: trimmedCity,
  //   House_No: trimmedHouseNo,
  //   State: trimmedState,
  //   altr_number: trimmedAltrNumber,
  //   postcode: trimmedPostcode,
  // };

  console.log("Email:", email);
  console.log("ID:", id);

  // Use findOneAndUpdate to update the specific address in the array
  Userdb.findOneAndUpdate(
    { email: email, "address._id": id },
    {
      $set: {
        "address.$.Address": trimmedAddress,
        "address.$.City": trimmedCity,
        "address.$.House_No": trimmedHouseNo,
        "address.$.State": trimmedState,
        "address.$.altr_number": trimmedAltrNumber,
        "address.$.postcode": trimmedPostcode,
      },
    },
    { new: true } // Return the modified document
  )
    .then((updatedDocument) => {
      // Check if any document was modified
      if (!updatedDocument) {
        console.error("Address not found");
        return res.status(404).send("Address not found");
      }

      console.log("Address updated successfully:", updatedDocument);
      res.redirect("/user-address"); // Redirect to the address page after successful update
    })
    .catch((err) => {
      console.error("Error updating address:", err);
      res.status(500).send("Internal Server Error");
    });
};

exports.updateprofile = async (req, res) => {
  try {
    const email = req.session.email;
    const id = req.query.id;

    console.log("Email:", email);
    console.log("User ID:", id);

    // Check if both userName and mobile contain only spaces
    if (!req.body.userName.trim() || !req.body.mobile.trim()) {
      return res.send("enter Valid details");
    }

    // Validate mobile number format
    const mobileRegex = /^\d{10}$/;
    if (req.body.mobile && !mobileRegex.test(req.body.mobile)) {
      return res.send("Mobile number should contain 10 digits");
    }

    const data = await Userdb.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          userName: req.body.userName,
          mobile: req.body.mobile,
        },
      },
      { new: true } // Use { new: true } to get the updated document as the result
    );

    console.log("Updated Data:", data);

    if (data) {
      res.send(
        "<script>alert('Data updated successfully!'); window.location='/user-account-details?id=" +
          data._id +
          "';</script>"
      );
    } else {
      res.send(
        "<script>alert('User not found!'); window.location='/some-error-page';</script>"
      );
    }
  } catch (err) {
    console.error("Error:", err);
    res.send(err);
  }
};

exports.checkOut = async (req, res) => {
  try {
    const email = req.session.email;
    console.log(email);

    let totalprice;
    const index = req.query.id || 0;
    const prId = req.query.prId;
    let discountedPrice;

    console.log(totalprice + " from checkout 2");

    if (prId) {
      const productData = await productDb.findById(prId).populate("offer");
      if (productData.offer !== null) {
        discountedPrice =
          productData.price -
          productData.price * (productData.offer.discount / 100);
      } else {
        discountedPrice =
          productData.price - productData.price * (productData.discount / 100);
      }
      console.log(discountedPrice);

      totalprice = discountedPrice;
      req.session.newPrice = totalprice;
    } else {
      const cartData = await cartDb.find({ email: email });
      // Assuming cartData is an array, use reduce to calculate the total discounted price
      totalprice = cartData.reduce(
        (acc, item) =>
          acc +
          calculateDiscountedPrice(
            item.price,
            item.discount,
            item.cartQuantity
          ),
        0
      );

      req.session.newPrice = totalprice;
    }

    const userdata = await Userdb.findOne({ email: email });

    if (userdata) {
      res.render(
        "checkout",
        {
          prId: prId,
          users: userdata,
          price: totalprice,
          a: index,
        },
        (err, html) => {
          if (err) {
            console.log(err);
            return res.send("Internal Server error " + "1");
          }
          delete req.session.discountApplied;
          res.send(html);
        }
      );
    } else {
      res.json({
        success: false,
        message: "User not found.",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error " + "2");
  }
};

// Function to calculate discounted price
function calculateDiscountedPrice(originalPrice, discountPercentage, quantity) {
  const discountAmount = (discountPercentage / 100) * originalPrice;
  const discountedPrice = originalPrice - discountAmount;
  return discountedPrice * quantity;
}

exports.loadcheckout = async (req, res) => {
  try {
    const email = req.session.email;
    const totalprice = req.body.totalsum;
    const index = req.query.id;
    const prId = req.query.prId;

    console.log("hello" + index);
    console.log(totalprice + "from checkout 2");

    // Find the user
    const user = await Userdb.findOne({ email: email });

    // Update the addresses array
    user.address.forEach((address, i) => {
      address.default = i === index; // Set the selected address as default
    });

    // Explicitly set default for the selected address
    user.address[index].default = true;

    console.log("Updated user.address:", user.address);

    // Save the updated user data
    await user.save();

    // Fetch the updated user data
    const userdata = await Userdb.findOne({ email: email });

    console.log("Updated user data:", userdata);

    // Render the checkout page with the updated data
    const selectedAddress = userdata.address[index];
    console.log("Selected address:", selectedAddress);

    res.render("checkout", {
      prId: prId,
      users: userdata,
      defaultAddress: selectedAddress,
      price: totalprice,
      a: index,
    });
  } catch (err) {
    console.error("Error:", err);
    res.send(err);
  }
};

exports.addAddressCheckout = async (req, res) => {
  try {
    const email = req.session.email;

    const NewAddress = {
      Address: req.body.Address,
      City: req.body.City,
      House_No: req.body.House_No,
      State: req.body.State,
      altr_number: req.body.altr_number,
      postcode: req.body.postcode,
      default: Boolean(req.body.default),
    };

    req.session.address = NewAddress;

    // Use findOneAndUpdate to get the document before the update
    const result = await Userdb.findOneAndUpdate(
      { email: email },
      { $push: { address: NewAddress } },
      { new: true } // Return the modified document
    );

    if (!result) {
      console.log("no address is added");
      return res
        .status(404)
        .json({ error: "User not found or no modifications made" });
    }

    // Access the _id from the result
    const id = result._id;

    res.redirect("/checkout-page");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.verifyPassword = async (req, res) => {
  try {
    const email = req.session.email;

    console.log(email);
    const oldPassword = req.body.password;

    const user = await Userdb.findOne({ email: email });

    if (user) {
      console.log(user);
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);

      if (passwordMatch) {
        // Passwords match, handle success (e.g., redirect or send a success response)
        res.redirect("/change-password");
      } else {
        // Passwords do not match
        req.session.notCorrect = true;
        res.redirect("/change-password/confirm");
      }
    } else {
      // User not found
      res.send("User not found");
    }
  } catch (err) {
    // Handle other errors
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.newPassword = async (req, res) => {
  try {
    const email = req.session.email;
    const newPassword = req.body.password;
    const confirmpassword = req.body.confirmpassword;

    // console.log('Email:', email);
    // console.log('New Password:', newPassword);

    // Validate email and password
    if (!email || !newPassword) {
      return res.status(400).send("Email and password are required.");
    }
    if (confirmpassword !== newPassword) {
      return res.status(400).send("Password are not same.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const response = await Userdb.updateOne(
      { email: email },
      { $set: { password: hashedPassword } }
    );

    console.log(response);

    if (response) {
      // Password reset successful
      console.log("Password change successful.");

      const user = await Userdb.findOne({ email: email });
      const userId = user.id;
      res.redirect(`/user-account-details/?id=${userId}`);
    } else {
      // No user found with the provided email
      console.log("User not found for the provided email.");
      return res.status(404).send("User not found for the provided email.");
    }
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.ourstore = (req, res) => {
  const email = req.session.email;
  const searchQuery = req.query.search;
  const catFilter = req.query.catFilter;
  const min = req.query.min;
  const max = req.query.max;
  const page = req.query.page || 1;
  const itemsPerPage = 6;
  const filter = { catStatus: true, active: true };

  console.log("min" + min, "max" + max);

  if (catFilter) {
    filter.category = catFilter;
  }

  if (min && max) {
    if (max > min) {
      filter.price = { $gte: parseInt(min), $lte: parseInt(max) };
    } else {
      req.session.priceError = true;
    }
  } else if (min) {
    filter.price = { $gte: parseInt(min) };
  } else if (max) {
    filter.price = { $lte: parseInt(max) };
  }

  if (searchQuery) {
    filter.$or = [
      { pname: { $regex: new RegExp(searchQuery, "i") } },
      { category: { $regex: new RegExp(searchQuery, "i") } },
    ];
  }

  productDb
    .find(filter)
    .populate("offer")
    .then((alldata) => {
      console.log(alldata);
      categorydb.find({ active: true }).then((data) => {
        req.session.catData = data;

        Userdb.findOne({ email: email }).then((userdata) => {
          const totalProducts = alldata.length;
          const totalPages = Math.max(
            1,
            Math.ceil(totalProducts / itemsPerPage)
          );
          const skipCount = (page - 1) * itemsPerPage;
          const productdata = alldata.slice(
            skipCount,
            skipCount + itemsPerPage
          );

          res.render("ourStore", {
            email: email,
            products: productdata,
            categories: data,
            users: userdata,
            searchQuery,
            catFilter,
            min: min,
            max: max,
            currentPage: parseInt(page),
            totalPages: totalPages,
          });
        });
      });
    });
};

exports.promoCode = async (req, res) => {
  const promoCode = req.body.coupon.toUpperCase();
  let price = req.session.newPrice;
  req.session.promocode = promoCode;

  console.log(req.session.newPrice);
  console.log(promoCode);

  try {
    const data = await couponDb.findOne({
      code: promoCode,
      active: true,
      expired: false,
    });

    if (data) {
      console.log(data);
      if (req.session.discountApplied) {
        return res.json({
          success: false,
          message: "Coupon has already been applied",
        });
      }

      // price = price - 20;
      const discountedPrice = Math.ceil(
        price - (price * data.discountPercentage) / 100
      );
      console.log(discountedPrice, "dic");
      req.session.newPrice = discountedPrice;
      console.log(req.session.newPrice, "luffyyy");

      req.session.discountApplied = true;
      req.session.discountPercentage = data.discountPercentage; // Set the flag to indicate discount applied
      return res.json({
        success: true,
        coupon: data.code,
        discount: discountedPrice,
        discountPercent: data.discountPercentage,
      });
    } else {
      console.log(6);
      return res.json({ success: false, message: "Coupon is invalid" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
