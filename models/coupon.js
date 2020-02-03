const fs = require('fs'); //file system
const jwt = require('jsonwebtoken'); //generate json token
const Joi = require('joi');
//const PasswordComplexity = require('joi-password-complexity');
const bcrypt = require('bcryptjs'); // for password encryption
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');

const couponSchema = function(coupon){
    this.code = coupon.code;
    this.cost = coupon.cost;
}

couponSchema.checkCouponCodeExist = function (coupon_code, result) {
    sql("Select * from fw_scratch where code = ? and status = 'Y' ", coupon_code, function (err, res) {             
            if(err) {                  
                //console.log(err);              
                result(err, null);
            }else{
                //console.log(res);
                result(null, res);          
            }
        });   
};

module.exports.couponSchema = couponSchema;