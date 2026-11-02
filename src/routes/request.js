const express = require('express');
const requestRouter= express.Router();
const ConnectionRequest = require("../models/connectionRequest");

const {userAuth} = require("../middleware/auth");
const User = require("../models/user");


requestRouter.post("/request/send/:status/:toUserId", userAuth ,async (req ,res) => {

    try{
       const fromUserId = req.user._id;
       const toUserId = req.params.toUserId;
       const status = req.params.status;

       const allowedStatus = ["ignored","interested"];
       if(!allowedStatus.includes(status)){
        return res 
           .status(400)
           .json({message: "Invalid status type:" + status});
       }
       //rendome user access nahi kar sakta 
       const toUser = await User.findById(toUserId);
       if(!toUser){
         return res.status(404).json({message: "user not found"})
       }

       //IF there is exixting connection request
       const existingConnectionRequest = await ConnectionRequest.findOne({
         $or:[
            { fromUserId , toUserId },
            { fromUserId : toUserId , toUserId : fromUserId }
         ],
       });
       if(existingConnectionRequest){
         return res.status(400).send({message:"Connection request already exists !!!"})
       }

       //new instance 

       const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
       });

       const data = await connectionRequest.save();

       res.json({
        message: req.user.firstName+"  is  "+ status + "  to  " + toUser.firstName ,
        data,
       });
    }catch(err){
       res.status(400).send("ERROR :" + err.message);
    }
}   


);

module.exports = requestRouter;