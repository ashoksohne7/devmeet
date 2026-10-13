const express = require("express");

const app = express();

app.use(
    "/user" , 
    (req,res , next) => {
    console.log("sending");
    next();
    res.send("1 response");

    
},
     
    (req,res) => {
        console.log("next is executed")
        res.send("2 response")
    }


);



app.listen(7777 , () =>{
    console.log("server is successfully listen on 7777")
});
