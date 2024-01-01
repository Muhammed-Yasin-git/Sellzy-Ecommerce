const express = require('express');
const router = express.Router();
const adminServices = require("../services/adminRender")
const upload = require("../services/multer")

const middlewares = require("../../middlewares/adminmiddleware")




const adminController = require("../controller/adminController")
const blockUser = require("../controller/blockController")
const productController = require("../controller/productController")
const categoryController = require("../controller/categoryController")
const orderController = require("../controller/orderController")



  
router.get("/update-image", adminServices.updateimage); // update page image
router.get("/image-delete", productController.deleteImage); // update page image
router.post("/api/add-product",upload.array("image", 12), productController.newproduct); // Add new Image
router.post("/upload-image",upload.array("image", 12),productController.uploadimage); // upload image

router.get('/admin-login',adminServices.adminlogin)
router.get('/admin-dash',middlewares.authenticateMiddleware,adminServices.admindash)
router.get('/admin-products',middlewares.authenticateMiddleware,adminServices.adminProducts)
router.get('/admin-order',middlewares.authenticateMiddleware,adminServices.adminOrder)
router.get('/admin-users',middlewares.authenticateMiddleware,adminServices.adminusers)
router.get('/admin-category',middlewares.authenticateMiddleware,categoryController.admincategory)
router.get('/user-details',middlewares.authenticateMiddleware,adminServices.userdetails)

router.get('/add-products',middlewares.authenticateMiddleware,adminServices.addproduct)
router.get('/update-product',middlewares.authenticateMiddleware,adminServices.updateproduct1)
router.get('/delete-product',middlewares.authenticateMiddleware,adminServices.deleteproduct)
router.get('/unlist-product',middlewares.authenticateMiddleware,productController.softdelete)
router.get('/delete-product',middlewares.authenticateMiddleware,productController.deleteProduct)
router.get('/restore-product',middlewares.authenticateMiddleware,productController.restoreProduct)
router.get('/unlisted-product',middlewares.authenticateMiddleware,adminServices.restoreProduct)


router.get('/order-details/admin',middlewares.authenticateMiddleware,adminServices.yourOrders)
router.post('/change-status',middlewares.authenticateMiddleware,orderController.changeStatus)
router.post('/api/getDetailsChart',middlewares.authenticateMiddleware,adminController.chartData)

//API
router.get('/add-category',adminServices.addcategory)
router.post('/add-Category',categoryController.addcategory)
router.get('/unlist-category',categoryController.unlistcategory)
router.get('/unlisted-category',categoryController.unlistedcategory)
router.get('/delete-category',categoryController.deletecategory)
router.get('/restore-category',categoryController.restorecategory)
router.get('/single-catogary',categoryController.singlecategory)


router.post('/adminlogin',middlewares.checkNotAuthenticateAdmin,adminServices.isAdmin)
router.get('/api/users',adminController.find)
router.get('/api/products',productController.findproducts)
router.get('/api/block',blockUser.block)
router.get('/admin-logout',adminController.logout)


router.post('/api/update-product', upload.single('prd_image'), productController.updateproduct)







module.exports = router