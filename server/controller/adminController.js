const Userdb = require("../model/usermodel");
const orderDb = require("../model/ordermodel");
const fs = require("fs");
const path = require("path");
const CsvParser = require("json2csv").Parser;
const ejs = require("ejs")
const puppeteer = require("puppeteer")

exports.find = (req, res) => {
  Userdb.find()
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      res
        .status(500)
        .send({
          message:
            err.messsage || "Error Occured while retrieving user information",
        });
    });
};

exports.logout = (req, res) => {
  req.session.adminAuthenticated = false;
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

(exports.chartData = async (req, res) => {
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
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };

        salesCount = new Array(7).fill(0);

        findQuerry = {
          orderDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
          },
        };
        index = 0;
        break;
      case "Monthly":
        currentYear = new Date().getFullYear();
        labelObj = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        };

        salesCount = new Array(12).fill(0);

        findQuerry = {
          orderDate: {
            $gte: new Date(currentYear, 0, 1),
            $lte: new Date(currentYear, 11, 31, 23, 59, 59),
          },
        };
        index = 1;
        break;
      case "Daily":
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth() + 1;
        let end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        end = String(end).split(" ")[2];
        end = Number(end);

        for (let i = 0; i < end; i++) {
          labelObj[`${i + 1}`] = i;
        }

        salesCount = new Array(end).fill(0);

        findQuerry = {
          orderDate: {
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0, 23, 59, 59),
          },
        };
        index = 2;
        break;
      case "Yearly":
        findQuerry = {};

        const ord = await orderDb.find().sort({ orderDate: 1 });
        const stDate = ord[0].orderDate.getFullYear();
        const endDate = ord[ord.length - 1].orderDate.getFullYear();

        for (let i = 0; i <= Number(endDate) - Number(stDate); i++) {
          labelObj[`${stDate + i}`] = i;
        }

        salesCount = new Array(Object.keys(labelObj).length).fill(0);

        index = 3;
        break;
      default:
        return res.json({
          label: [],
          salesCount: [],
        });
    }

    const orders = await orderDb.find(findQuerry);

    orders.forEach((order) => {
      salesCount[labelObj[String(order.orderDate).split(" ")[index]]] += 1;
    });

    res.json({
      label: Object.keys(labelObj),
      salesCount,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal server err");
  }
}),

  exports.salesReport= async (req, res) => {
    let renderedTemplate;
    try {
      const browser = await puppeteer.launch({ 
        headless: "new",
      });

      const order = await getSalesReport(req.body.fromDate, req.body.toDate, req.body.full);
      //for pdf download
      
      if(req.body.type === 'pdf'){

        const salesTemplate = fs.readFileSync(
          path.join(__dirname, "../../views/salesPDF.ejs"),
          "utf-8"
        );
        const totalOrder = await orderDb.countDocuments({ "status": "pending" });

        const amountOfUsers = await Userdb.find({}).count();
        const totalSales = await orderDb.aggregate([
          { $group: { _id: null, sum: { $sum: "$price" } } },
        ]);
        const totalSalesAmount = totalSales.length > 0 ? totalSales[0].sum : 0;;

          orderDb.find()
          .then(data=>{
            console.log(data); 
           renderedTemplate = ejs.render(salesTemplate, { order:data, fromDate: req.body.fromDate, toDate: req.body.toDate, total: req.body.full,totalSalesAmount:totalSalesAmount, });
          })
        

        const page = await browser.newPage();

        await page.setContent(renderedTemplate);

        const pdfBuffer = await page.pdf({
          format: 'A4',
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");

        res.end(pdfBuffer);

        await browser.close();
        return;
      }
     
            let totalOrders;
            const startDate = new Date(req.body.fromDate);
            const endDate = new Date(req.body.toDate);
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
            const totalOrdersCount = totalOrders.reduce(
              (acc, order) => acc + order.count,
              0
            );
            // Add the totals to the CSV values
            csvValues += `${totalOrdersCount},${totalUsers},${
              totalSales[0]?.sum || 0
            }\n`;
            const csvData = csvHeader + csvValues;
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", "attachment;filename=salesReport.csv");
            res.status(200).send(csvData);
          } catch (err) {
      console.log(err);
      res.status(500).send("Internal server err");
    }
  }

  /////////////////////////////////////\

  async function getSalesReport(fromDate, toDate, full) {
    try {
        const agg = [
            {
              $unwind: {
                path: "$products",
              },
            },  
            {
              $sort: {
                orderDate: -1,
              },
            },
        ];
        // get all details of sales report withn the given dates

        if (!full) {
            agg.splice(0, 0, {
                $match: {
                    $and: [
                        {
                            orderDate: { $gte: new Date(fromDate) }
                        },
                        {
                            orderDate: { $lte: new Date(new Date(toDate).getTime() + 1 * 24 * 60 * 60 * 1000) }
                        }
                    ]
                }
            });
        }
        
        return await orderDb.aggregate(agg);
    } catch (err) {
        throw err;
    }
}


// //////////////////////////////////////

async function getAllDashCount() {
  try {
    // Returns total user count
    const totalOrder = await orderDb.countDocuments({ "status": "pending" });

    const amountOfUsers = await Userdb.find({}).count();
    const totalSales = await orderDb.aggregate([
      { $group: { _id: null, sum: { $sum: "$price" } } },
    ]);

    const totalSalesAmount = totalSales.length > 0 ? totalSales[0].sum : 0;;

    // Return an object with all counts for admin dashboard
    return {
        userCount:amountOfUsers,
        newOrders: totalOrder,
        tSalary: totalSalesAmount,
    }
} catch (err) {
    throw err;
}
}
