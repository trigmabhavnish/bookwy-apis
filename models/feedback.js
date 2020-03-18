
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
        sql("SELECT fw_user.user_id, fw_user.user_name, fw_user.first_name, fw_user.profile_pic,fw_feedback.overall_rate,fw_feedback.project_id, fw_feedback.user_id,fw_feedback.feed_desc,fw_feedback.feed_con,fw_feedback.feed_date,fw_feedback.status FROM fw_feedback INNER JOIN fw_user ON fw_feedback.user_id = fw_user.user_id where fw_feedback.status='Y' ORDER BY fw_feedback.feed_date DESC LIMIT " + skip + "," + limit, function (err, res) {
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


feedBackSchema.getFeedBackDetails = function (obj, result) {
    // let userId = obj.userId
    sql("SELECT fw_feedback.project_id,fw_feedback.user_id,fw_feedback.status,fw_feedback.feed_desc,fw_feedback.feed_con,fw_feedback.feed_date,fw_feedback.overall_rate,fw_user.user_id,fw_user.user_name, fw_user.first_name, fw_user.profile_pic,fw_project.id,fw_project.project_name FROM fw_feedback INNER JOIN fw_user ON fw_feedback.user_id=fw_user.user_id INNER JOIN fw_project ON fw_feedback.project_id=fw_project.id where fw_feedback.user_id = ? AND fw_feedback.project_id = ?", [obj.userId, obj.projectId], function (err, feedback) {
        sql("SELECT * from fw_allrate where user_id = ? AND project_id = ?", [obj.userId, obj.projectId], function (err, allrate) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { feedback: { feedback, allrate } });
            }
        });
    })
};


feedBackSchema.getCompletedProjects = function (obj, result) {
    // let userId = obj.userId
    sql("SELECT project_id from fw_feedback where user_id=?", obj.userId, function (err, feedback) {
        let feedbackProjectIds = [];
        feedback.forEach(element => {
            feedbackProjectIds.push(element.project_id);
        });//fetch those projects only have submitted feedback
        let condition = "";
        if(feedback.length){
            let queryString = feedbackProjectIds.toString();//ids of those projects have already submitted feedbacks
            condition =  `and id not in(${queryString})`;
        }
        
        let query = `SELECT project_name ,id from fw_project where user_id = ${obj.userId} AND project_status = 'Complete' ${condition} `
        sql(query, function (err, projects) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { projects: projects });
            }
        });
    })
};


feedBackSchema.saveFeedBack = function (obj, result) {
    let body = obj.body;
    let overall_rate = Math.ceil((body.O + body.R+body.G+body.F+body.S+body.T)/6); // calculate overall rate 
    // let userId = obj.userId
    let feedBackQuery = `insert into fw_feedback(project_id,user_id,feed_desc,overall_rate,feed_date,status) values ('${body.project_id}','${obj.userId}','${body.feed_des}','${overall_rate}','${new Date().toISOString().slice(0, 19).replace('T', ' ')}','N')`;
    let allRatingQuery = `insert into fw_allrate(project_id,user_id,rate_value,type) values('${body.project_id}','${obj.userId}','${body.O}','O'),
    (${body.project_id},${obj.userId},${body.R},'R'),
    (${body.project_id},${obj.userId},${body.G},'G'),
    (${body.project_id},${obj.userId},${body.F},'F'),
    (${body.project_id},${obj.userId},${body.S},'S'),
    (${body.project_id},${obj.userId},${body.T},'T')`;

    sql(feedBackQuery, function (err, feedback) {
        sql(allRatingQuery, function (err, allrate) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { feedback: { feedback, allrate } });
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