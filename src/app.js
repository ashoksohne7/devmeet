const express = require("express");

const app = express();

app.get("/user" ,(req ,res) => {
    res.send({firstname:"ashok" , lastname:"sohne"});
});

app.post("/user" ,(req , res) => {
    
    res.send("data saved successfully");
});

app.use("/test" , (req,res) => {
    res.send("Hellow from the me heheheh ashok")
});



app.listen(7777 , () =>{
    console.log("server is successfully listen on 7777")
});
