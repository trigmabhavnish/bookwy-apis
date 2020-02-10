
const Joi = require('joi');
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const feedBackSchema = {};


// SELECT sm.support_type, sp.message FROM fw_support_master as sm INNER JOIN fw_support as sp ON sm.id = sp.support_id WHERE sm.user_id = 19316

feedBackSchema.getFeedBackList = function (obj, result) {
    let skip = obj.skip;
    let limit = obj.limit;
    // let userId = obj.userId
    sql("SELECT COUNT(*) as totalItem from  fw_feedback where status='Y'", function (err, count) {
        sql("SELECT fw_user.user_id, fw_user.user_name,fw_feedback.overall_rate,fw_feedback.project_id, fw_feedback.user_id,fw_feedback.feed_desc,fw_feedback.feed_con,fw_feedback.feed_date,fw_feedback.status FROM fw_feedback INNER JOIN fw_user ON fw_feedback.user_id = fw_user.user_id where fw_feedback.status='Y' LIMIT " + skip + "," + limit, function (err, res) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { feedback: res, count: count });
            }
        });
    })
};



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

module.exports.feedBackSchema = feedBackSchema;