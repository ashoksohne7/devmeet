const express = require("express");
const connectDb = require("./config/database")
const app = express();
const User = require("./models/user");

app.use(express.json())

app.post("/signup" , async (req,res) => {
    
 //creating a instance of model
    const user = new User(req.body);
   try{
    await user.save();
   res.send("user added successfully")
   }catch(err){
    res.status(400).send("Error saving the user :" + ree.message);
   }
});

//get user by emailId findOne()
app.get("/user", async (req , res)=> {
    const userEmail = req.body.emailId;

    try{
        const user = await User.find({emailId:userEmail});
        if(user.length === 0) {
            res.status(400).send("User not found");
        }else{
        res.send(user)
        }
    }
    catch(err){
        res.status(400).send("someting went wrong")
    }
});

//FEAD API - GET /FEAD - get all tha user from the database
app.get("/fead" , async (req,res) => {
    try{
        const users =await User.find({});
        res.send(users)
    }
    catch(err){
        res.status(400).send("someting went wrong");
    }
});

//Delete use by id
app.delete("/user", async (req,res) => {
        const userId = req.body.userId;
    try{
     const user = await User.findByIdAndDelete(userId);
     res.send("user is deleted")
    }catch(err){
       res.status(400).send("someting went wrong");
    };
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
