
const Joi = require('joi');
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const supportSchema = {};


// SELECT sm.support_type, sp.message FROM fw_support_master as sm INNER JOIN fw_support as sp ON sm.id = sp.support_id WHERE sm.user_id = 19316

supportSchema.getSupportTickets = function (obj, result) {
    let skip = obj.skip;
    let limit = obj.limit;
    let userId = obj.userId
    sql("SELECT COUNT(*) as totalItem from  fw_support_master where user_id =?", userId, function (err, count) {
        sql("SELECT * from fw_support_master where user_id=" + userId + " LIMIT " + skip + "," + limit, function (err, res) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { tickets: res, count: count });
            }
        });
    })
};
supportSchema.getMessages = function (supportId, result) {

    sql("SELECT * FROM fw_support where support_id = ?", supportId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

supportSchema.getDirector = function (directorId, result) {
    // console.log('ddd', directorId);
    sql("SELECT * from fw_project_director where id = ?", directorId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};


/**
 * get only one support ticket for details
 */
supportSchema.getSupportTicket = function (supportId, result) {
    sql("SELECT * from fw_support_master where id = ?", supportId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

supportSchema.getTicketMessages = function (supportId, result) {
    sql("SELECT * from fw_support where support_id = ?", supportId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

supportSchema.createTicket = function (body, userId, result) {

    let subject_type = body.support_type;
    let subject = body.subject;
    let code = makeRandomString();
    let created_on = new Date();
    sql("insert into fw_support_master set  support_type= ? ,subject = ? ,code = ?, created_on = ?, user_id = ? ,support_status = ? ", [subject_type, subject, code, created_on, userId , 'unsolved'], function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
}


supportSchema.saveMessage = function (body, supportId,userId, result) {
    let message = body.message;
    let support_file_url = body.support_files.length ?  body.support_files[0].file_path : null;
    let cur_Date = new Date();
    sql("insert into fw_support set support_id = ? ,message = ? ,instanciate_id = ?, cur_date = ? ,support_file = ? ", [supportId, message, userId, cur_Date,support_file_url], function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
}





supportSchema.updateTicket = function (supportId, result) {
    sql("UPDATE fw_support_master set support_status = 'solved' where id = ? ", supportId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
}


/**
 * Generate Random String 
 */
function makeRandomString() {
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const lengthOfCode = 5;
    let text = "";
    for (let i = 0; i < lengthOfCode; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

module.exports.supportSchema = supportSchema;