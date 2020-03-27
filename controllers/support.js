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
    supportSchema
} = require('../models/support');
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

const {
    sendMail
} = require('../helpers/emailService');

/**
 * get All support Listing
 */
controller.post('/getSupportTickets', async (req, res) => {
    // Fetch UserDetails using Auth Token
    var authToken = req.headers['x-auth-token'];
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }
        if (userDetails.length > 0) {
            supportSchema.getDirector(userDetails[0].director_id, async function (err, director) {

                let profilePic = userDetails[0].profile_pic;
                //console.log('hello', profile[0].profile_pic)
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
                            userDetails[0].profile_pic = completedFilePathLocal + profilePic;
                        } else {
                            // S3 File Path
                            userDetails[0].profile_pic = completedFilePath + profilePic;
                        }
                    });

                }

                supportSchema.getSupportTickets({ userId: userDetails[0].user_id, skip: skip, limit: limit }, async function (err, resp) {
                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
                    // Update Account Balance of User
                    resp.tickets.forEach((element) => {
                        let messages = [];
                        supportSchema.getMessages(element.id, async function (err, message) {
                            messages.push(message[0]);
                            messages.push(message[message.length - 1]);
                            element['messages'] = messages;
                            element['director'] = director;


                        })


                    });
                    setTimeout(() => {
                        res.status(def.API_STATUS.SUCCESS.OK).send({ totalItems: resp.count[0].totalItem, tickets: resp.tickets, user: userDetails[0] });

                    }, 4000)

                });
            })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }
    });
});

/**
 * This is for creating ticket form user end
 */
controller.post('/createSupportTicket', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {

            supportSchema.createTicket(req.body, userDetails[0].user_id, async function (err, result) {
                if (err) {
                    return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED });
                }





                supportSchema.saveMessage(req.body, result.insertId, userDetails[0].user_id, async function (err, message) {
                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                    else {


                        // Send Email to User


                        const name = userDetails[0].first_name + ' ' + userDetails[0].last_name

                        /* let body_message = 'We have received your support ticket.<br><br><br>Subject: ' + req.body.subject + '<br><br>From: ' + userDetails[0].first_name + '<br><br>Body: ' + req.body.message + '<br><br><br>Our team will be replying to this shortly. &#128578;';

                        let ticket_subject = 'Ticket "' + req.body.subject + '" Created'*/

                        const mailBody = {
                            to: userDetails[0].email,
                            from: config.get('fromEmail'),
                            subject: 'Ticket Created',
                            template_id: config.get('email_templates.support_ticket_template'),
                            dynamic_template_data: {
                                name: (userDetails[0].first_name) ? userDetails[0].first_name : userDetails[0].user_name,
                                ticket_subject: req.body.subject,
                                body_message: req.body.message
                            }
                        }
                        sendMail(mailBody)
                        // Send Email to User


                        res.status(def.API_STATUS.SUCCESS.OK).send(true);
                    }
                })

            })

        }
        else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }

    })
})




/**
 * This is for creating ticket form user end
 */
controller.post('/saveMessage', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        if (userDetails.length > 0) {

            supportSchema.saveMessage(req.body, req.body.support_id, userDetails[0].user_id, async function (err, message) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                else {
                    res.status(def.API_STATUS.SUCCESS.OK).send(message);
                }
            })

        }
        else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }

    })
})

/**
 * This is for update ticket to solved form user end
 */
controller.post('/updateTicket', async (req, res) => {



    supportSchema.updateTicket(req.body.support_id, async function (err, message) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_UPDATE }); }
        else {
            res.status(def.API_STATUS.SUCCESS.OK).send(message);
        }
    })



})


/**
 * get support details with messages
 */
controller.post('/getTicketDetails', async (req, res) => {
    // Fetch UserDetails using Auth Token
    var authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }
        if (userDetails.length > 0) {
            let responseObj = {};
            supportSchema.getDirector(userDetails[0].director_id, async function (err, director) {
                supportSchema.getSupportTicket(req.body.supportId, async function (err, support) {
                    if (err) return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS });
                    else {
                        supportSchema.getTicketMessages(req.body.supportId, async function (err, messages) {

                            if (messages.length > 0) {
                                messages.forEach((element) => {
                                    if (element.support_file != "") {

                                        let completedFilePath = config.get('aws.bucket_url');
                                        let completedFilePathLocal = 'assets/';

                                        var params = {
                                            Bucket: config.get('aws.bucket'),
                                            Key: element.support_file
                                        };

                                        s3.headObject(params, function (err, metadata) {

                                            if (err && err.code === 'NotFound') {
                                                // Local File Path  
                                                element.support_file = completedFilePathLocal + element.support_file;
                                            } else {
                                                // S3 File Path
                                                element.support_file = completedFilePath + element.support_file;
                                            }
                                        });

                                    }
                                })
                            }

                            responseObj['director'] = director;
                            responseObj['support'] = support;
                            responseObj['messages'] = messages;
                            responseObj['user'] = userDetails[0];

                            setTimeout(() => {
                                res.status(def.API_STATUS.SUCCESS.OK).send(responseObj);
                            }, 4000);

                        })
                    }



                })
            })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }
    });
});





module.exports = controller;