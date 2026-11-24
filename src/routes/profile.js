const express = require('express');
const profileRouter= express.Router();

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "yrl4lnm8";
const CLOUDINARY_PREFIX = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;
const isAllowedPhoto = (u) =>
  typeof u === "string" &&
  u.startsWith(CLOUDINARY_PREFIX) &&
  u.length < 500 &&
  !u.includes(" ");

const {userAuth} = require("../middleware/auth");
const {valiDateProfileEditData} = require("../utils/validation");


profileRouter.get("/profile/view", userAuth , async(req,res) => {
try{
    const user = req.user;
       const { password, ...safeUser } = user.toObject();
res.send(safeUser);
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

      // photos must come from our Cloudinary account (unchanged old values are fine)
      const newPhoto = req.body.photoUrl;
      if (newPhoto && newPhoto !== logedInUser.photoUrl && !isAllowedPhoto(newPhoto)) {
        throw new Error("Please upload your photo using the Upload button");
      }


     Object.keys(req.body).forEach((key) => (logedInUser[key] = req.body[key]));
     await logedInUser.save();

     const { password, ...safeUser } = logedInUser.toObject();

     res.json({
       message: `${logedInUser.firstName}, your profile updated successfully`,
       data: safeUser,
   });

     
    }catch (err){
        res.status(400).send("ERROR : " + err.message)
    }


});


module.exports = profileRouter;