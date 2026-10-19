const mongoose = require ('mongoose');
const validator = require("validator");

const userSchema = new mongoose.Schema({
    firstName : {
        type: String,
        required: true ,
        minLenght: 2,
        maxLenght: 18,
    } ,
    lastName : {
        type: String
    } ,

    emailId : {
        type: String,
        lowercase: true ,
        required: true,
        unique: true,
        trim: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("invalid emailid : " + value );
            }
        }

    } ,

    password: {
        type: String,
        required: true 
    } ,

    age : {
        type: Number,
        min: 14 ,
    } ,

    gender : {
        type: String,
        validate(value) {
            if (!["male","female" ,"other"].includes(value)) {
                throw new Error("Gender data is not valid")
            }
        },
    } ,

    photoUrl : {
        type: String ,
    } ,

    about : {
        type: String,
        default: "this is the deafault about of user " ,
    } ,

    skills : {
        type: [String] ,
    } ,
  },
{
  timestamps : true , 
}
);

module.exports = mongoose.model("user", userSchema);