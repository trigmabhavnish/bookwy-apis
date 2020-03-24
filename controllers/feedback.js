const config = require('config');
const express = require('express');
const controller = express.Router();
const { creditSchema, validateTransactionData } = require('../models/credit');
const {
    userSchema
} = require('../models/user');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const {
    feedBackSchema
} = require('../models/feedback');

const aws = require('aws-sdk');
aws.config.update({
    // Your SECRET ACCESS KEY from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.SECRET_ACCESS_KEY
    secretAccessKey: config.get('aws.secretKey'),
    // Not working key, Your ACCESS KEY ID from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.ACCESS_KEY_ID
    accessKeyId: config.get('aws.accessKey'),
    region: config.get('aws.region'), // region of your bucket
});

const s3 = new aws.S3();

/**
 * get All support Listing
 */
controller.post('/getFeedBacks', async (req, res) => {
    // Fetch UserDetails using Auth Token
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);
    feedBackSchema.getFeedBackList({ skip: skip, limit: limit }, async function (err, resp) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
        if (resp.feedback.length > 0) {

            resp.feedback.forEach((element) => {
                let completedFilePath = config.get('aws.bucket_url');
                let completedFilePathLocal = 'assets/';
                if (element.profile_pic != "") {
                    var params = {
                        Bucket: config.get('aws.bucket'),
                        Key: element.profile_pic
                    };

                    s3.headObject(params, function (err, metadata) {
                        //console.log('eer', err);
                        if (err && err.code === 'NotFound') {
                            // Local File Path  
                            element.profile_pic = completedFilePathLocal + element.profile_pic;
                        } else {
                            // S3 File Path
                            element.profile_pic = completedFilePath + element.profile_pic;
                        }
                    });

                }
            });
        }

        setTimeout(() => {
            res.status(def.API_STATUS.SUCCESS.OK).send({ totalItems: resp.count[0].totalItem, feedback: resp.feedback, });
        }, 4000);

    })

});



controller.post('/getFeedBackDetails', async (req, res) => {
    feedBackSchema.getFeedBackDetails({ userId: req.body.userId, projectId: req.body.projectId }, async function (err, resp) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }

        let profilePic = resp.feedback.feedback[0]['profile_pic'];
        let completedFilePath = config.get('aws.bucket_url');
        let completedFilePathLocal = 'assets/';
        if (profilePic != "") {
            var params = {
                Bucket: config.get('aws.bucket'),
                Key: profilePic
            };

            s3.headObject(params, function (err, metadata) {
                //console.log('eer', err);
                if (err && err.code === 'NotFound') {
                    // Local File Path  
                    resp.feedback.feedback[0]['profile_pic'] = completedFilePathLocal + profilePic;
                } else {
                    // S3 File Path
                    resp.feedback.feedback[0]['profile_pic'] = completedFilePath + profilePic;
                }
            });

        }

        setTimeout(() => {
            res.status(def.API_STATUS.SUCCESS.OK).send({ feedback: resp.feedback });
        }, 4000);

    })

});


controller.post('/getCompletedProjects', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        feedBackSchema.getCompletedProjects({ userId: userDetails[0].user_id }, async function (err, resp) {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }

            res.status(def.API_STATUS.SUCCESS.OK).send({ projects: resp.projects, });

        })
    });

});



controller.post('/saveFeedBack', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        feedBackSchema.saveFeedBack({ userId: userDetails[0].user_id, body: req.body }, async function (err, resp) {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
            res.status(def.API_STATUS.SUCCESS.OK).send({ response: true });

        })
    });

});


module.exports = controller;