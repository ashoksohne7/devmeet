const mongoose = require('mongoose');

const connectDb = async () => {
await mongoose.connect(
    "mongodb+srv://ashoksohne77_db_user:Ashok_sohne_%40777@cluster0.cqycppx.mongodb.net/devMeet"
  );
};

module.exports = connectDb ;
