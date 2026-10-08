const express = require("express");

const app = express();

app.use("/test" , (req,res) => {
    res.send("Hellow from the me heheheh ashok")
});

app.listen(7777 , () =>{
    console.log("server is successfully listen on 7777")
});
