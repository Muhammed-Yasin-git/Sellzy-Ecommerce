
const Userdb = require("../model/usermodel")
const orderDb = require("../model/ordermodel")
const CsvParser = require("json2csv").Parser;



exports.find = (req,res)=>{
    Userdb.find()
    .then(user=>{
        res.send(user)
    })
    .catch(err=>{
        res.status(500).send({message:err.messsage||"Error Occured while retrieving user information"});
    }); 
}

exports.logout = (req, res) => {
    req.session.adminAuthenticated = false
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send({
                message: "Error occurred while logging out",
            });
        }
        // Redirect to the admin-login page after successful logout
        res.redirect("/admin-login");
    });
};


exports.chartData=async (req, res) => {
    try {
      let labelObj = {};
      let salesCount;
      let findQuerry;
      let currentYear;
      let currentMonth;
      let index;
      console.log(req.body.filter);
      switch (req.body.filter) {
        case "Weekly":
          currentYear = new Date().getFullYear();
          currentMonth = new Date().getMonth() + 1;

          labelObj = {
            "Sun": 0,
            "Mon": 1,
            "Tue": 2,
            "Wed": 3,
            "Thu": 4,
            "Fri": 5,
            "Sat": 6,
          };

          salesCount = new Array(7).fill(0);

          findQuerry = {
            orderDate: {
              $gte: new Date(currentYear, currentMonth - 1, 1),
              $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
            }
          };
          index = 0;
          break;
        case "Monthly":
          currentYear = new Date().getFullYear();
          labelObj = {
            "Jan": 0,
            "Feb": 1,
            "Mar": 2,
            "Apr": 3,
            "May": 4,
            "Jun": 5,
            "Jul": 6,
            "Aug": 7,
            "Sep": 8,
            "Oct": 9,
            "Nov": 10,
            "Dec": 11,
          }

          salesCount = new Array(12).fill(0);

          findQuerry = {
            orderDate: {
              $gte: new Date(currentYear, 0, 1), 
              $lte: new Date(currentYear, 11, 31, 23, 59, 59), 
            }
          }
          index = 1;
          break;
          case "Daily":
            currentYear = new Date().getFullYear();
            currentMonth = new Date().getMonth() + 1;
            let end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
            end = String(end).split(' ')[2];
            end = Number(end);

            for(let i = 0; i < end; i++){
              labelObj[`${i + 1}`] = i;
            }

            salesCount = new Array(end).fill(0);

            findQuerry = {
              orderDate: {
                $gte: new Date(currentYear, currentMonth - 1, 1),
                $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
              }
            };
            index = 2;
            break;
          case "Yearly":
            findQuerry = {}

            const ord = await orderDb.find().sort({orderDate: 1});
            const stDate = ord[0].orderDate.getFullYear();
            const endDate = ord[ord.length - 1].orderDate.getFullYear();

            for(let i = 0; i <= (Number(endDate) - Number(stDate)); i++){
              labelObj[`${stDate + i}`] = i;
            }

            salesCount = new Array(Object.keys(labelObj).length).fill(0);

            index = 3;
            break;
        default:
          return res.json({
            label: [],
            salesCount: []
          });
      }

      const orders = await orderDb.find(findQuerry);

      orders.forEach(order => {
        salesCount[labelObj[String(order.orderDate).split(' ')[index]]] += 1;
      });

      res.json({
        label: Object.keys(labelObj),
        salesCount
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server err');
    }
  },
  exports.salesReport = async (req, res) => {
    try {
      let totalOrders;
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
  
      totalOrders = await orderDb.aggregate([
        {
          $match: {
            orderDate: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: "$_id",
            count: { $sum: 1 },
            products: { $push: "$products" }, // Collect products for each order
          },
        },
        { $project: { count: 1, products: 1 } },
      ]);
  
      const totalUsers = await Userdb.countDocuments();
      const totalSales = await orderDb.aggregate([
        {
          $match: {
            orderDate: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$products" },
        {
          $group: {
            _id: null,
            sum: { $sum: "$products.price" },
          },
        },
      ]);
      const csvFields = ["Order ID", "Product Name", "Product Price"];
      const csvHeader = csvFields.join(",") + "\n";
      let csvValues = "";
      totalOrders.forEach((order) => {
        order.products.forEach((product) => {
          csvValues += `${order._id},"${product.pname}",${product.price}\n`;
        });
      });
      const totalOrdersCount = totalOrders.reduce((acc, order) => acc + order.count, 0);
      // Add the totals to the CSV values
      csvValues += `${totalOrdersCount},${totalUsers},${totalSales[0]?.sum || 0}\n`;
      const csvData = csvHeader + csvValues;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment;filename=salesData.csv");
      res.status(200).send(csvData);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }