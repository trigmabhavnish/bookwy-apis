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
                let UpdatedAccountBalance = userDetails[0].account_balance + req.body.qty;
                userSchema.updateUserAccountBalance(UpdatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                    if (err) {                        
                        return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS });
                    }

                   /* // Update in Payment Orders Page
                    let paymentOrderDetails = {user_id: userDetails[0].user_id, instantiate_id:newCredit, type:'credits', amount: req.body.cost}
                    creditSchema.addPaymentOrders(paymentOrderDetails, async function (err, newPaymentOrderId) {});
                    // Update in Payment Orders Page

                    // Send Email to User
                    const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                    const mailBody = {
                        to: userDetails[0].email,
                        from: config.get('fromEmail'),
                        subject: "Bookwy: Credits Added",
                        template_id: config.get('email_templates.add_credits_template'),
                        dynamic_template_data: {
                            name: name,
                            credits: req.body.qty,
                            transaction_id: req.body.transaction_code,
                            amount_charged: req.body.amount_charged,
                            payment_type: req.body.payment_method,
                            payment_date: req.body.payment_date,
                        }
                    }
                    sendMail(mailBody)
                    // Send Email to User */


                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.CREDITS_ADDED });
                });
                 // Update Account Balance in User Profile

                
            });
        } else {
            if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_CREDITS }); }
        }


    });
});




controller.post('/transactionListing', async (req, res) => {

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