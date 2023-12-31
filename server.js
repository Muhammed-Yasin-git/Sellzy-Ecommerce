const express = require("express")
const dotenv = require("dotenv").config();
const path = require("path")
const bodyParser = require('body-parser');
const session = require('express-session');
const connectDB = require('./server/database/connection');
const morgan = require("morgan");



const app = express()

// dotenv.config({ path: 'config.env' })   
const PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(morgan('tiny'))


app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:true,
    saveUninitialized:true
}))


connectDB();


app.use('/css', express.static(path.resolve(__dirname, 'assets/css')));
app.use('/img', express.static(path.resolve(__dirname, 'assets/img')));
app.use('/js', express.static(path.resolve(__dirname, 'assets/js')));
app.use('/fonts', express.static(path.resolve(__dirname, 'assets/fonts')));
app.use('/images', express.static(path.resolve(__dirname, 'images')));

app.set("view engine", "ejs")

app.use("/", require("./server/routes/userRouter"))



app.use('/', require('./server/routes/adminRouter'))

app.listen(PORT, () => console.log(`Server is Running on http://localhost:${PORT}`)) 