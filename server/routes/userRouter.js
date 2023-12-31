const express = require('express');
const router = express.Router();
const userServices = require("../services/userRender")
const middlewares = require("../../middlewares/usermiddleware")

const userController = require("../controller/userController")
const cartController = require("../controller/cartController")
const orderController = require("../controller/orderController")





router.get('/',userController.userHome)
router.get('/signin',middlewares.checkNotAuthenticateuser,userServices.signin)
router.get('/signup',middlewares.checkNotAuthenticateuser,userServices.signup)
router.get('/our-store',userController.ourstore)
router.get('/verify',userServices.verify)


router.get('/account-details',middlewares.userCheckMiddleware,userServices.userdetails)
router.get('/user-account-details',middlewares.userCheckMiddleware,userServices.userhomedetails)
router.get('/add-address',middlewares.userCheckMiddleware,userServices.addAddress)
router.post('/Add-address',userController.addAddress)
router.get('/product-details',userServices.productdetails)
router.get('/user-address',middlewares.userCheckMiddleware,userServices.userAddress)
router.get('/delete-address',middlewares.userCheckMiddleware,userController.deleteAddress)
router.get('/update-address',middlewares.userCheckMiddleware,userServices.updateAddress)
router.post('/update-address',userController.updateAddress)
router.post('/make-default',userController.makeDefault)


router.get('/edit-profile',middlewares.userCheckMiddleware,userServices.editprofile) 
router.post('/update-profile',userController.updateprofile) 
router.get('/change-password/confirm',userServices.oldPassword) 
router.post('/verify-password',userController.verifyPassword) 
router.get('/change-password',userServices.changePassword) 
router.post('/new-password',userController.newPassword) 



router.post('/checkout-page',userController.checkOut)
router.get('/checkout-page',middlewares.userCheckMiddleware,userServices.checkOut)
router.post('/checkout/address',userController.loadcheckout)

router.get('/Add-address/checkout',middlewares.userCheckMiddleware,userServices.addAddresscheckout)
router.post('/Add-address/checkout',userController.addAddressCheckout) 



router.post('/submit-order',orderController.submitOrder)
router.get('/your-orders',middlewares.userCheckMiddleware,userServices.yourOrders)
router.get('/cancel-order',userServices.cancelOrder)
router.post('/cancel-reason',orderController.cancel)
router.get('/api/reason',userServices.cancelReason)
router.get('/return-order',userServices.returnOrder)
router.get('/api/return/reason',userServices.returnReason)
router.post('/return-reason',orderController.return)

router.get('/order-details',userServices.orderdetails)
router.get('/order-success',userServices.orderSuccess)
router.post('/payment-success',orderController.paymentSuccess)




router.get('/forget-password',userServices.forgot)
router.get('/reset-password-otp',userServices.otp1)


router.post('/verify-otp',userController.otpReset)
router.get('/verify-otp',userServices.otp)
router.get('/reset-password-form',userServices.resetpassword)
router.post('/send-otp',userController.sendOtp)
router.post('/otp-verify',userController.otpverify)
router.post('/forgot-password',userController.forgotpassword)
router.post('/resend-otp', userController.resendOtp);
router.post('/reset-password', userController.resetpassword);
//API




router.post('/api/signup',userController.create)
router.post('/api/signin',middlewares.checkNotAuthenticateuser,userController.find)
router.post('/api/logout',userController.logout)



router.get("/api/cart",middlewares.userCheckMiddleware,cartController.AddToCart); //For login the user
router.get("/MyCart",middlewares.userCheckMiddleware,cartController.MyCart); //For login the user
router.get("/remove-product", cartController.RemoveProduct); //For login the user
router.get("/cart/inc", cartController.inc); // add user to another collction
router.get("/cart/dec", cartController.decre); // add user to another collction


module.exports = router