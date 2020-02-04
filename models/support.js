
const Joi = require('joi');
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');


supportSchema.getProjectPackages = function (status, result) {
    sql("select * from fw_support_master where user_id = "+$uid+" order by id desc limit 0,1", status, function (err, res) {             
            if(err) {                  
                //console.log(err);              
                result(err, null);
            }else{
                //console.log(res);
                result(null, res);          
            }
        });   
};

module.exports.supportSchema = supportSchema;