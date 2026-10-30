const express = require("express");
const connectDb = require ("./config/database")
const app = express();
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
    
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");

app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",requestRouter);

connectDb()
.then(() => {
    console.log("db connected suuccessfully");
    app.listen(7777 , () =>{
    console.log("server is successfully listen on 7777")
});
})
.catch(err=>{
    console.log("db not connected", err.message);
});
