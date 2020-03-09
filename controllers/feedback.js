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

/**
 * get All support Listing
 */
controller.post('/getFeedBacks', async (req, res) => {
    // Fetch UserDetails using Auth Token
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);
    feedBackSchema.getFeedBackList({ skip: skip, limit: limit }, async function (err, resp) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
        //console.log('feedback', resp.feedback);
        res.status(def.API_STATUS.SUCCESS.OK).send({ totalItems: resp.count[0].totalItem, feedback: resp.feedback, });
    })

});



controller.post('/getFeedBackDetails', async (req, res) => {
    feedBackSchema.getFeedBackDetails({ userId: req.body.userId, projectId: req.body.projectId }, async function (err, resp) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }

        res.status(def.API_STATUS.SUCCESS.OK).send({ feedback: resp.feedback, });

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
        feedBackSchema.saveFeedBack({ userId: userDetails[0].user_id ,body:req.body}, async function (err, resp) {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
            res.status(def.API_STATUS.SUCCESS.OK).send({response:true});

        })
    });

});


module.exports = controller;