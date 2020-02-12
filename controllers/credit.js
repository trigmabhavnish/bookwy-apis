const config = require('config');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const _ = require('lodash'); //js utility lib
const fs = require('fs');
const jwt = require('jsonwebtoken'); //generate json token
const validate = require('../interceptors/validate');
const bcrypt = require('bcryptjs'); // for password encryption
const express = require('express');
const controller = express.Router();
const {
    creditSchema,
    validateTransactionData
} = require('../models/credit');

const {
    couponSchema
} = require('../models/coupon');

const {
    userSchema
} = require('../models/user');


controller.post('/checkCouponCodeExist', async (req, res) => {

    //checking coupon code exists
    couponSchema.checkCouponCodeExist(req.body.coupon_code, async function (err, coupon) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

        if (coupon.length > 0) {
            res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, cost: coupon[0].cost });
        } else {
            res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS, cost: '' });
        }


    });
});

controller.post('/onTransactionComplete', validate(validateTransactionData), async (req, res) => {

    //console.log(req.body);
    // Fetch UserDetails using Auth Token
    var authToken = req.body.auth_token;

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }

        if (userDetails.length > 0) {
            let creditDetails = { code: req.body.code, unit: req.body.unit, qty: req.body.qty, cost: req.body.cost, payment_method: req.body.payment_method, status: req.body.status, coupon_code: req.body.coupon_code, discount: req.body.discount, transaction_code: req.body.transaction_code, admin_note: req.body.admin_note, user_id: userDetails[0].user_id };
            var newCredits = new creditSchema(creditDetails);
            creditSchema.addCredits(newCredits, async function (err, newCredit) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }

                // Update Account Balance in User Profile
                userSchema.updateUserAccountBalance(req.body.qty, userDetails[0].user_id, function (err, userUpdate) {
                    if (err) {                        
                        return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS });
                    }

                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.CREDITS_ADDED });
                });

                
            });
        } else {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }
        }


    });
});




controller.post('/transactionListing', async (req, res) => {

    //console.log(req.body);
    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);
    //Verify User 
 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }
      
        if (userDetails.length > 0) {
            creditSchema.getListing({userId:userDetails[0].user_id,skip:skip,limit:limit}, async function (err, response) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }

                res.status(def.API_STATUS.SUCCESS.OK).send({ transactions:response.transactions,totalItems : response.count[0].totalItem });
            });
        } else {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }
        }


    });
});

module.exports = controller;