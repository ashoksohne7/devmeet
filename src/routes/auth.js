const express = require('express');
const authRouter= express.Router();

const{validateSignUpData} = require("../utils/validation");
const User = require("../models/user");
const bcrypt = require("bcrypt");

authRouter.post("/signup" , async (req,res) => {
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



authRouter.post("/login" , async (req , res ) => {
    try{

        const{emailId , password} = req.body ;

        const user = await User.findOne({emailId: emailId});
        if(!user){
            throw new Error("EmailId is not present in Database");
        }
        
        const isPasswordValid = await user.validatePassword(password)
        if(isPasswordValid) {
            //Create a JWT token

            const token = await user.getJWT()

            //Add the token to cookie and send the response back to the use
            res.cookie("token",token , { 
                expires: new Date(Date.now() + 8 * 3600000),
            });
            res.send("login successfull !")
        }else{
            throw new Error("Password is not correct ");
        }
    }catch(err){
       res.status(400).send("Error saving the user :" + err.message)
    }
});



module.exports = authRouter;