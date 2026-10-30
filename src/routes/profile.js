const express = require('express');
const profileRouter= express.Router();
const {userAuth} = require("../middleware/auth");
const {valiDateProfileEditData} = require("../utils/validation");


profileRouter.get("/profile/view", userAuth , async(req,res) => {
try{
       const user = req.user;
       res.send(user);
   }catch(err){
    res.status(400).send("Error saving the user :" + err.message)
}
});

profileRouter.patch("/profile/edit",userAuth , async (req , res ) => {
    try{
    
   if( !valiDateProfileEditData(req)){
    throw new Error("Invalid Edit request")
    
   }
     const logedInUser = req.user;
     console.log(logedInUser);

     Object.keys(req.body).forEach((key) => (logedInUser[key] = req.body[key]));
     console.log(logedInUser);
     req.send("Profile Update is Done bro !!!")
    }catch (err){
        res.status(400).send("ERROR : " + err.message)
    }


})


module.exports = profileRouter;