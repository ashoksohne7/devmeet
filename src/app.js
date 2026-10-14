const express = require("express");

const app = express();

const {adminAuth , userAuth}=require("./middleware/auth")

app.use("/admin", adminAuth);
app.use("/user", userAuth);

app.get("/user" , userAuth , (req , res) => {
    res.send("user data send");
})


app.get("/admin/getalldata" , (req , res) => {
    res.send("all data send");
})


app.get("/admin/deletuser" , (req , res) => {

    // logic of fatching all data

    res.send("all data deleted");
})

app.listen(7777 , () =>{
    console.log("server is successfully listen on 7777")
});
