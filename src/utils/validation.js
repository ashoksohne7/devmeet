const validator = require('validator');

const validateSignUpData = (req) => {
    const { firstName , lastName , emailId , password} = req.body ;

    if(!firstName || !lastName ) {
        throw new Error("Please enter the name !")
    }

    else if(!validator.isEmail(emailId)){
        throw new Error("Email is not valid !")
    }

    else if(!validator.isStrongPassword(password)){
        throw new Error("Please Enter a Strong password !")
    }
};

const valiDateProfileEditData = (req) => {
    const allowdEditFields = [
        "firstName" , 
        "lastName" , 
        "about" ,
        "gender",
        "age",
        "skills" 
    ];

   const isEditAllowed = Object.keys(req.body).every(field => 
    allowdEditFields.includes(field)
);
return isEditAllowed ;
}
module.exports ={
    validateSignUpData,
    valiDateProfileEditData
    
}