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
    couponSchema
} = require('../models/coupon');


controller.post('/checkCouponCodeExist', async (req, res) => {

    //checking coupon code exists
    couponSchema.checkCouponCodeExist(req.body.coupon_code, async function (err, coupon) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

        if(coupon.length > 0){
            res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, cost: coupon[0].cost });
        }else{
            res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS, cost: '' });
        }    


    });
});

module.exports = controller;