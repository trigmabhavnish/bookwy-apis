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
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER }); }
        if (userDetails.length > 0) {
            supportSchema.getDirector(userDetails[0].director_id, async function (err, director) {
                ;

                // console.log('the director is',director)
                supportSchema.getSupportTickets({ userId: userDetails[0].user_id, skip: skip, limit: limit }, async function (err, resp) {
                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
                    // Update Account Balance of User
                    resp.tickets.forEach(element => {
                        let messages = [];
                        supportSchema.getMessages(element.id, async function (err, message) {

                            messages.push(message[0]);
                            messages.push(message[message.length - 1]);
                            element['messages'] = messages;
                            element['director'] = director;
                            res.status(def.API_STATUS.SUCCESS.OK).send({ totalItems: resp.count[0].totalItem, tickets: resp.tickets, user: userDetails[0] });

                        })

                    });

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
                console.log('the support is ', result)
                if (err) {
                    return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED });
                }
                {
                    supportSchema.saveMessage(req.body, result.insertId, userDetails[0].user_id, async function (err, message) {
                        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                        else {
                            res.status(def.API_STATUS.SUCCESS.OK).send(true);
                        }
                    })
                }
            })

        }
        else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
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
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER }); }
        if (userDetails.length > 0) {
            let responseObj = {};
            supportSchema.getDirector(userDetails[0].director_id, async function (err, director) {
                console.log('the support is',director)
                supportSchema.getSupportTicket(req.body.supportId, async function (err, support) {
                    if (err) return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER });
                    else {
                        supportSchema.getTicketMessages(req.body.supportId, async function (err, messages) {
                            responseObj['director'] = director;
                            responseObj['support'] = support;
                            responseObj['messages'] = messages;
                            responseObj['user'] = userDetails[0];

                            res.status(def.API_STATUS.SUCCESS.OK).send(responseObj);

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