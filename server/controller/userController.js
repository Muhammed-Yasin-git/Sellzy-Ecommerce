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
  axios.get('http://localhost:3000/api/products')
    .then((product) => {
      const userEmail = req.session.email;

      Userdb.find({ email: userEmail })
        .then((userData) => {
          // console.log(userData);
          if (userEmail) {
            req.session.isBlock = false
            req.session.isValidate = false;
            res.render("user_home", { products: product.data, users: userData });
          } else {
            req.session.isBlock = false
            req.session.isValidate = false;
            res.render("user_home", { products: product.data, users: null });
          }
        })
        .catch((err) => {
          console.log(err);
          res.render("user_home", { products: product.data, users: null, status: null });
        });
    })
    .catch((err) => {
      console.error(err);
      res.send(err);
    });
};


exports.logout = (req, res) => {
  nemail = req.body.email;
  console.log(nemail);

  Userdb.updateOne({ email: nemail }, { $set: { status: "Inactive" } })
    .then((response) => {
      req.session.userAuthenticated = false
      res.redirect('/signin');
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

exports.sendOtp = (req, res) => {
  if (!req.body || !req.body.email) {
    console.log("not working");
    res.send("Email is required");
    return;
  }

  req.session.email = req.body.email;
  sendOtpMail(req, res);
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

    const NewAddress = {
      Address: req.body.Address,
      City: req.body.City,
      House_No: req.body.House_No,
      State: req.body.State,
      altr_number: req.body.altr_number,
      postcode: req.body.postcode,
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

    res.redirect(`/user-account-details?id=${id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Assuming this is in your userController.js
exports.deleteAddress = (req, res) => {
  const email = req.session.email;
  const id = req.query.id;

  Userdb.findOneAndUpdate({ email: email }, { $pull: { address: { _id: id } } })
    .then(data => {
      // Redirect to user account details without passing the deleted address ID
      res.redirect(`/user-account-details?id=${data._id}`);
    })
    .catch(err => {
      res.send(err);
    });
};


exports.updateAddress  = (req,res)=>{
  const email = req.session.email;
  const id = req.query.id

  Userdb.findOneAndUpdate(
    { email: email },
    {
      $set: {
        address: {
          Address: req.body.Address,
          City: req.body.City,
          House_No: req.body.House_No,
          State: req.body.State,
          altr_number: req.body.altr_number,
          postcode: req.body.postcode,
        }
      }
    }
  ).then(data => {
  res.send("<script>alert('Data updated successfully!'); window.location='/user-address';</script>");
})
.catch(err => {
  res.send(err);
});
}





exports.updateprofile = async (req, res) => {
  try {
    const email = req.session.email;
    const id = req.query.id;

    console.log("Email:", email);
    console.log("User ID:", id);

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
      res.send(`<script>alert('Data updated successfully!'); window.location='/user-account-details?id=${data._id}';</script>`);
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
