const express = require("express");
const connectDb = require("./config/database")
const app = express();
const User = require("./models/user");

app.post("/signup" , async (req,res) => {
    // creating a instance of user model
    const user = new User({
        firstName : "ashok",
        lastName : "sohne",
        emailId : "ashoksohne@gmail.com",
        password : "Ashok@777"
    });
   try{
    await user.save();
   res.send("user added successfully")
   }catch(err){
    res.status(400).send("Error saving the user :" + ree.message);
   }
});

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
