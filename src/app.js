require("dotenv").config();
const express = require("express");
const connectDb = require ("./config/database")
const app = express();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const cors = require("cors");

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.set("trust proxy", 2); // Vercel -> Render -> app
app.use(helmet());

// brute-force protection on login/signup only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many attempts. Please try again in a few minutes.",
});
app.use(["/login", "/signup"], authLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.get("/health", (req, res) => res.send("ok"));
    
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");

app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",requestRouter);
app.use("/",userRouter);


connectDb()
.then(() => {
    console.log("db connected suuccessfully");
    app.listen(process.env.PORT || 7777 , () =>{
    console.log("server is successfully listen on " + (process.env.PORT || 7777))
});
})
.catch(err=>{
    console.log("db not connected", err.message);
});
