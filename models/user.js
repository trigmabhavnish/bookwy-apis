const fs = require('fs'); //file system
const jwt = require('jsonwebtoken'); //generate json token
const Joi = require('joi');
//const PasswordComplexity = require('joi-password-complexity');
const bcrypt = require('bcryptjs'); // for password encryption
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');
var _this = this;

const userSchema = function (user) {


    this.first_name = user.first_name;
    this.last_name = user.last_name;
    this.user_name = user.user_name;
    this.email = user.email;
    this.password = user.password;
    this.director_id = user.director_id;
    this.status = user.status;
    this.reg_date = new Date();
    /*this.last_login = "0000-00-00 00:00:00";
    this.account_balance = null;
    this.personal_notepad= null;    
    this.chk_active= 'N'; // default Value
    this.last_payment= "0000-00-00 00:00:00";
    this.company_name= '';
    this.profession= '';
    this.website= '';
    this.country= '';
    this.dob = "0000-00-00";
    this.profile_pic= null;
    this.security_qtn= null;
    this.security_ans= null;
    this.about_us= null;
    this.account_type= null;
    this.login_status= null;
    this.login_count= null;
    this.edit_count= null;
    this.sp_member_from = "0000-00-00";
    this.sp_member_to = "0000-00-00";
    this.res_section= null;
    this.res_member_from = "0000-00-00";
    this.res_member_to = "0000-00-00";
    this.admin_note= null;
    this.FID= null;
    this.affiliate_id= null;
    this.payment_status= null; */
};

userSchema.createUser = async function (newUser, result) {

    const hashPassword = await bcrypt.hash(newUser.password, await bcrypt.genSalt(10));
    newUser.password = hashPassword; // Modify Password

    sql("INSERT INTO fw_user set ?", newUser, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(err, null);
        } else {
            // Insert User Setting Notification
            sql("INSERT INTO fw_user_setting_notification SET user_id = ?", res.insertId, function (err, res) { });

            //console.log(res);
            result(null, res.insertId);
        }
    });
};

userSchema.checkEmailAlreadyExists = function (email, result) {
    sql("Select user_id from fw_user where email = ? ", email, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.fetchUserByAuthToken = function (authToken, result) {
    sql("Select user_id , director_id ,profile_pic, first_name , last_name  from fw_user where auth_token = ? and status = 'Y'", authToken, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.fetchUserById = function (user_id, result) {
    sql("Select email, first_name, last_name from fw_user where user_id = ? and status = 'Y'", user_id, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.checkUserLogin = function (email, result) {
    sql("Select user_id, password, user_name, account_type, first_name, last_name from fw_user where email = ? and status = 'Y'", email, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.updateLoginDetails = function (userId, lastLogin, authToken, result) {
    sql("UPDATE fw_user SET last_login = ?, auth_token = ? WHERE user_id = ?", [lastLogin, authToken, userId], function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(null, err);
        }
        else {
            result(null, res);
        }
    });
};

userSchema.logout = function (authToken, result) {
    sql("UPDATE fw_user SET auth_token = '' WHERE auth_token = ?", authToken, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(null, err);
        }
        else {
            //console.log("res", res)
            result(null, res);
        }
    });
};

userSchema.getDirectorId = function (result) {
    sql("select id from fw_project_director where status = 'Y' order by rand() limit 0, 1", function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.verifyAuthToken = function (verifyToken, result) {
    sql("select user_id from fw_user WHERE verification_string = ?", verifyToken, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.updateVerificationToken = function (verifyToken, email, result) {
    sql("UPDATE fw_user SET verification_string = ? WHERE email = ?", [verifyToken, email], function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.resetPassword = async function (password, user_id, result) {

    const hashPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));

    sql("UPDATE fw_user SET password = ? WHERE user_id = ?", [hashPassword, user_id], function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

userSchema.deleteVerificationToken = function (verifyToken, result) {
    sql("UPDATE fw_user SET verification_string = '' WHERE verification_string = ?", verifyToken, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};



const userJoiSchema = {

    first_name: Joi.string().trim().min(2).max(50).required(),
    last_name: Joi.string().trim().min(2).max(50).required(),
    user_name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().trim().email().required(),
    // password is required
    // password must have minimum 10 and maximum 50 characters
    password: Joi.string().trim().min(10).max(50).required(),
    confirm_password: Joi.any().valid(Joi.ref('password')).options({ language: { any: { allowOnly: "and Password don't match" } } }),
    director_id: Joi.number().required(),
    status: Joi.string().valid('Y', 'N').required(),

}

//validate user signup
function validateUser(user) {
    return Joi.validate(user, userJoiSchema, { allowUnknown: true });
}

//validate user login 
function validateUserLogin(user) {
    const schema = {
        email: Joi.string().email().required(),
        password: Joi.string().min(10).max(50).required()
    }

    return Joi.validate(user, schema, { allowUnknown: true });
}

function validateEmail(emailData) {

    // define the validation schema
    let schema = Joi.object().keys({
        // email is required
        // email must be a valid email string
        email: Joi.string().trim().email().required()

    }).unknown(true);
    return Joi.validate(emailData, schema, { allowUnknown: true });
}

function validateResetPassword(resetData) {

    // define the validation schema
    let schema = Joi.object().keys({
        password: Joi.string().trim().min(10).max(50).required(),
        confirm_password: Joi.any().valid(Joi.ref('password')).options({ language: { any: { allowOnly: "and Password don't match" } } }),
        user_id: Joi.number().required()

    }).unknown(true);
    return Joi.validate(resetData, schema, { allowUnknown: true });
}

module.exports.userSchema = userSchema;
module.exports.userJoiSchema = userJoiSchema;
module.exports.validateUser = validateUser;
module.exports.validateEmail = validateEmail;
module.exports.validateResetPassword = validateResetPassword;
module.exports.validateUserLogin = validateUserLogin;