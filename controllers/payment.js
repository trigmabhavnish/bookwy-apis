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
const Twocheckout = require('2checkout-node');
const {
    creditSchema,
    validateTransactionData
} = require('../models/credit');
const {
    userSchema
} = require('../models/user');
/**
 * make payment 
 */
controller.post('/make-payment', async (req, res) => {
    console.log('the', config.get('twocheckout.sellerId'), config.get('twocheckout.privateKey'))

    var tco = new Twocheckout({
        sellerId: config.get('twocheckout.sellerId'),                                  // Seller ID, required for all non Admin API bindings 
        privateKey: config.get('twocheckout.privateKey'),                            // Payment API private key, required for checkout.authorize binding
        sandbox: true,
        demo: true,                                                  // Uses 2Checkout sandbox URL for all bindings
    });



    creditSchema.getLatestPayemntId(function (err, response) {
        if (err) {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: error.message });
        } else {


            var params = {
                "merchantOrderId": response[0].id + 1000,
                "token": req.body.token,
                "currency": "USD",
                "total": req.body.amount_to_pay,
                "billingAddr": {
                    "name": "Joe Flagster",
                    "addrLine1": "123 Main Street",
                    "city": "Townsville",
                    "state": "Ohio",
                    "zipCode": "43206",
                    "country": "USA",
                    "email": "javedganai14@gmail.com",
                    "phoneNumber": "5555555555"
                }
            };
            console.log('hi', params)
            tco.checkout.authorize(params, function (error, data) {
                if (error) {
                    return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: error.message });
                } else {
                    var authToken = req.headers['x-auth-token'];
                    let paymentResponse = data.response;
                    let body = req.body;
                    body['transactionId'] = paymentResponse.transactionId
                    //Verify User 
                    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
                        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                        else {
                            if (userDetails.length > 0) {
                                creditSchema.addCreditsByTwoCheckout(userDetails[0].user_id, body, function (err, result) {
                                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                                    else {
                                        res.status(def.API_STATUS.SUCCESS.OK).send({ result: result });
                                    }
                                })
                            } else {
                                return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_SAVED })
                            }
                        }


                    })


                }
            });
        }


    })




})




module.exports = controller;