const jwt = require("jsonwebtoken")
const User = require("../models/user")

const userAuth = async (req ,res , next)  => {
   
    try{ //Read the Token from the requiest cookies
    const {token} = req.cookies;
    if(!token){
        throw new Error("Token is not valid ")
    }
    const decodedObj = await jwt.verify(token, "Dev@meet77");
    
    const{ _id} = decodedObj;
    const user = await User.findById(_id);
    if(!user){
        throw new Error("User not found")
    }
    req.user=user;
    next();
}
    catch(err){
        res.status(400).send("ERROR :" + err.message)
    }
    //find the user
};


module.exports = {
    
    userAuth
};