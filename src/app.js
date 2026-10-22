const express = require("express");
const connectDb = require ("./config/database")
const app = express();
const User = require("./models/user");
const {validateSignUpData} = require("./utils/validation");
const bcrypt = require("bcrypt");



app.use(express.json())

app.post("/signup" , async (req,res) => {
try{
 //Validation od data 
 validateSignUpData(req);
 
 const {firstName,lastName,emailId,password} =req.body;
 
 //Encrypt the password

 const passwordHash = await bcrypt.hash(password,10)
 console.log(passwordHash);
    
 //creating a instance of model
 
    const user = new User({
        firstName,
        lastName,
        emailId,
        password : passwordHash ,
    });

   
    await user.save();
   res.send("user added successfully")
   }catch(err){
    res.status(400).send("Error saving the user :" + err.message);
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

//Update user using patch
app.patch("/user/:userId" , async (req, res) => {
    const userId = req.params?.userId;
    const data = req.body;

    try{
             const Allowd_Update = ["userId" , "photoUrl" , "about" , "age" , "gender" , "skills"];
             const isUpdateAllowed = Object.keys(data).every((k)=>
             Allowd_Update.includes(k)
       );

         if(!isUpdateAllowed) {
        res.status(400).send("update is not allowed");
          };

         if(data?.skills.length > 10){
            throw new Error("skills cannot be more than 10")
         };

        const user = await User.findByIdAndUpdate({ _id : userId } , data ,{
            returnDocument: "after",
            runValidators: true,
        });
         console.log(user)
         res.send("user updated successfully")
    }catch(err){
       res.status(400).send("someting went wrong" + err.message);
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
