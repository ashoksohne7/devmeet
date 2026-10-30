const mongoose = require ('mongoose');
const validator = require("validator");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt");


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
        required: true, 
        validate(value){
            if(!validator.isStrongPassword(value)){
                throw new Error("Enter a strong password : " + value );
            }
        }

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
userSchema.methods.getJWT =  async function(){
    const user = this ;

    const token = await jwt.sign({ _id: user._id} ,  "Dev@meet77",{
         expiresIn:"7d",
    });

    return token ;
}

userSchema.methods.validatePassword =async function (passwordInputByUser) {
    const user = this ;
    const passwordHash = user.password ;

    const isPasswordValid = await bcrypt.compare(
        passwordInputByUser,
        passwordHash
    
    );
    return isPasswordValid ;
}
module.exports = mongoose.model("user", userSchema);