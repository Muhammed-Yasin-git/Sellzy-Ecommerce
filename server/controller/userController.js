const bcrypt = require('bcrypt');
const Userdb = require("../model/usermodel");
const otpdb = require("../model/otpmodel");
const blockDb = require("../model/blockmodel");
const axios = require("axios");
const nodemailer=require("nodemailer")
const Mailgen=require("mailgen")


var nemail = '';

exports.create = (req, res) => {
  if (!req.body) {
    res.status(400).send({ message: "content cannot be empty" });
    return;
  }

  // Ensure that password and confirmpassword match
  if (req.body.password !== req.body.confirmpassword) {
    return res.status(400).send({ message: "Password and Confirm Password do not match!" });
  }

  // Validate email, mobile, etc.

  // Hash the password
  bcrypt.hash(req.body.password, 10)
    .then((hashedPassword) => {
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
        .then(data => {
          console.log(data)
          res.redirect('/signin');
        })
        .catch((err) => {
          console.error(err);
          res.redirect('/signup');
        });
    });
};

exports.find = (req, res) => {
  if (!req.body) {
    res.status(400).redirect('/signin');
    return;
  }

  const nemail = req.body.email;
  const password = req.body.password;
  req.session.testemail=req.body.email;

  Userdb.findOne({ email: nemail })
    .then((user) => {
      if (user) {
        bcrypt.compare(password, user.password)
          .then((isPasswordValid) => {
            if (isPasswordValid) {
              blockDb.find({ email: nemail })
                .then(data => {
                  Userdb.updateOne({ email: nemail }, { $set: { status: "Active" } })
                    .then(() => {
                      // Set email in session for future use
                      req.session.email = nemail;
                      req.session.userAuthenticated = true
                      if (data.length !== 0) {
                        req.session.isBlock = true
                        res.redirect("/signin");
                      } else {
                        res.redirect('/');
                      }
                    })
                    .catch(err => {
                      console.error(err);
                      // Handle the error, if needed
                      res.status(500).send({ message: "Error updating user status" });
                    });
                })
                .catch(err => {
                  console.error(err);
                  res.status(500).send({ message: "Error checking block status" });
                });
            } else {
              req.session.isValidate = true;
              res.redirect('/signin');
            }
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send({ message: "Error comparing passwords" });
          });
      } else {
        req.session.isValidate = true;
        res.redirect('/signin');
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send({ message: "Error retrieving user data" });
    });
};

exports.userHome = (req, res) => {
  const userEmail = req.session.testemail;
  console.log("User email:", userEmail); // Log user email to check if it's defined

  axios.get('http://localhost:3000/api/products')
    .then((product) => {
      // console.log("Product data:", product.data); // Log product data

      if (userEmail) {
        Userdb.find({ email: userEmail })
          .then((userData) => {
            console.log("User data:", userData); // Log user data

            req.session.isBlock = false;
            req.session.isValidate = false;
            res.render("user_home", { products: product.data, users: userData });
          })
          .catch((err) => {
            console.log("Error fetching user data:", err);
            res.render("user_home", { products: product.data, users: null, status: null });
          });
      } else {
        req.session.isBlock = false;
        req.session.isValidate = false;
        res.render("user_home", { products: product.data, users: null });
      }
    })
    .catch((err) => {
      console.error("Axios error:", err);
      res.send(err);
    });
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
          res.redirect('/signin');
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
      link: "https://mailgen.js/"
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
      email:req.session.email,
      otp: otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 20000,
    });
    const data = await newOtp.save();
    // req.session.otpTd=data._id;
    res.status(200).redirect("/verify-otp");

    console.log('Recipient email:', req.session.email);
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
      res.redirect("/verify")
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

  otpdb.findOne({ otp: bodyOtp })
    .then(data => {
      if (data && data.expiresAt > Date.now()) {
        // If OTP exists and has not expired
        req.session.isAuth = data.email; // Assuming you want to set the email in the session
        res.redirect('/signup');
      } else {
        res.send("Invalid or expired OTP");
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).send("Error verifying OTP");
    });
};
exports.otpReset = (req, res) => {
  const bodyOtp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4;
  console.log(bodyOtp);

  otpdb.findOne({ otp: bodyOtp })
    .then(data => {
      if (data && data.expiresAt > Date.now()) {
        // If OTP exists and has not expired
        req.session.isAuth = data.email; // Assuming you want to set the email in the session
        res.redirect('/reset-password-form');
      } else {
        res.send("Invalid or expired OTP");
      }
    })
    .catch(err => {
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
      expiresAt: Date.now() + 20000,
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
          return res.status(400).send('Email and password are required.');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // console.log('Hashed Password:', hashedPassword);

      // Update the user's password in the database
      const response = await Userdb.updateOne({ email: email.trim() }, { $set: { password: hashedPassword } });

      // console.log('Update Response:', response);

      // Check if the update was successful
      if (response) {
          // Password reset successful
          console.log('Password reset successful.');
          return res.redirect('/signin');
      } else {
          // No user found with the provided email
          console.log('User not found for the provided email.');
          return res.status(404).send('User not found for the provided email.');
      }
  } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).send('Internal Server Error');
  }
};

// userServices.js


// userController.js

exports.addAddress = async (req, res) => {
  try {
    const email = req.session.email;

    const newAddress = {
      Address: req.body.Address,
      City: req.body.City,
      House_No: req.body.House_No,
      State: req.body.State,
      altr_number: req.body.altr_number,
      postcode: req.body.postcode,
      default: true
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

    res.redirect(`/user-account-details?id=${id}`);
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
    res.redirect(`/user-account-details?id=${user._id}`);
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

  Userdb.findOneAndUpdate(
    { email: email },
    { $pull: { address: { _id: id } } }
  )
    .then(data => {
      // Redirect to user account details without passing the deleted address ID
      res.redirect("/user-address");
    })
    .catch(err => {
      res.send(err);
    });
};



exports.updateAddress = (req, res) => {
  const email = req.session.email;
  const id = req.query.id;

  // Extract the address fields from the request body
  const updatedAddress = {
    Address: req.body.Address,
    City: req.body.City,
    House_No: req.body.House_No,
    State: req.body.State,
    altr_number: req.body.altr_number,
    postcode: req.body.postcode,
  };

  console.log("Email:", email);
  console.log("ID:", id);

  // Use findOneAndUpdate to update the specific address in the array
  Userdb.findOneAndUpdate(
    { email: email, "address._id": id },
    { $set: { "address.$": updatedAddress } },
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
          mobile: req.body.mobile
        }
      },
      { new: true } // Use { new: true } to get the updated document as the result
    );

    console.log("Updated Data:", data);

    if (data) {
      res.send("<script>alert('Data updated successfully!'); window.location='/user-account-details?id=" + data._id + "';</script>");
    } else {
      res.send("<script>alert('User not found!'); window.location='/some-error-page';</script>");
    }
  } catch (err) {
    console.error("Error:", err);
    res.send(err);
  }
};



exports.checkOut = (req, res) => {
  const email = req.session.email;
  console.log(email);
  const totalprice = req.body.totalsum;
  const index = req.query.id || 0;
  const prId = req.query.prId;

  console.log(totalprice + "from checkot 2");
  Userdb.findOne({ email: email })
    .then((userdata) => {
      console.log(userdata);
      res.render("checkout", {
        prId: prId,
        users: userdata,
        price: totalprice,
        a: index,
      });
    })
    .catch((err) => {
      res.send(err);
    });
};

exports.loadcheckout = (req, res) => {
  const email = req.session.email;
  const totalprice = req.body.totalsum;
  const index = req.query.id || 1;
  const prId = req.query.prId;

  console.log(totalprice + "from checkot 2");
  Userdb.findOne({ email: email })
    .then((userdata) => {
      console.log(userdata);
      res.render("checkout", {
        prId: prId,
        users: userdata,
        price: totalprice,
          a: index,
      });
    })
    .catch((err) => {
      res.send(err);
    });
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
      default: Boolean(req.body.default)
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


exports.changepassword = (req,res)=>{
  
}