const express = require("express");
const connectDb = require ("./config/database")
const app = express();
const User = require("./models/user");
const {validateSignUpData} = require("./utils/validation");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken")
const {userAuth} = require("./middleware/auth")

app.use(express.json());
app.use(cookieParser());
    
//SignUp Api
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

//login Api

app.post("/login" , async (req , res ) => {
    try{

        const{emailId , password} = req.body ;

        const user = await User.findOne({emailId: emailId});
        if(!user){
            throw new Error("EmailId is not present in Database");
        }
        
        const isPasswordValid = await bcrypt.compare(password , user.password);
        if(isPasswordValid) {
            //Create a JWT token

            const token = await jwt.sign({ _id: user._id} ,  "Dev@meet77",{
                expiresIn:"7d",
            });

            //Add the token to cookie and send the response back to the use
            res.cookie("token",token , { 
                expires: new Data(Data.now() + 8 * 3600000),
            });
            res.send("login successfull !")
        }else{
            throw new Error("Password is not correct ");
        }
    }catch(err){
       res.status(400).send("Error saving the user :" + err.message)
    }
});

//User profile
app.get("/profile", userAuth , async(req,res) => {
try{
       const user = req.user;
       res.send(user);
   }catch(err){
    res.status(400).send("Error saving the user :" + err.message)
}
});

//send connection request
app.post("/sendConnectionRequest", userAuth ,async (req ,res) => {
    
    console.log("sending  connectionRequest");
    res.send("connction request sended!");
   
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
