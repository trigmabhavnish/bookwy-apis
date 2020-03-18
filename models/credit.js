const fs = require('fs'); //file system
const jwt = require('jsonwebtoken'); //generate json token
const Joi = require('joi');
//const PasswordComplexity = require('joi-password-complexity');
const bcrypt = require('bcryptjs'); // for password encryption
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');

const creditSchema = function (credit) {
    this.code = credit.code;
    this.payment_date = new Date();
    this.unit = credit.unit;
    this.qty = credit.qty;
    this.cost = credit.cost;
    this.payment_method = credit.payment_method;
    this.user_id = credit.user_id;
    this.status = credit.status;
    this.coupon_code = credit.coupon_code;
    this.discount = credit.discount;
    this.transaction_code = credit.transaction_code;
    this.admin_note = credit.admin_note;
}

creditSchema.addCredits = async function (newCredits, result) {

    if (newCredits.payment_method == "paypal") {
        newCredits.payment_method = "P";
    } else {
        newCredits.payment_method = "MB";
    }

    sql("INSERT INTO fw_payment set ?", newCredits, function (err, res) {
        if (err) {
            result(err, null);
        } else {
            result(null, res.insertId);
        }
    });
};

creditSchema.getLatestPayemntId = async function (result) {
    sql('SELECT * FROM fw_payment ORDER BY ID DESC LIMIT 1', function (err, res) {
        if (err) {
            result(err, null);

        } else {
            result(null, res);
        }

    })
}

creditSchema.addCreditsByTwoCheckout = async function (user_id, body, result) {

    let paymentQuery =
        `INSERT INTO fw_payment (code,payment_date,unit,qty,cost,payment_method, user_id,status,
        coupon_code,discount,transaction_code,admin_note)
        VALUES('${body.code}','${new Date().toISOString().slice(0, 19).replace('T', ' ')}','Credits',
         '${body.credits}','${body.credits}','TC','${user_id}','Y',
         '${body.coupon_code}','${body.discount}','${body.transactionId}','')`
            sql(paymentQuery, function (err, res) {
                if (err) {
                    //console.log("error: ", err);
                    result(err, null);

                } else {
                    //console.log(res);
                    result(null, res);
                }

            })
};

creditSchema.addPaymentOrders = async function (paymentOrderDetails, result) {

    let paymentOrderQuery =
        `INSERT INTO fw_payment_orders (user_id, instantiate_id, type, amount)
        VALUES('${paymentOrderDetails.user_id}', '${paymentOrderDetails.instantiate_id}', '${paymentOrderDetails.type}', '${paymentOrderDetails.amount}')`;

    sql(paymentOrderQuery, function (err, res) {
        if (err) {
            result(err, null);
        } else {
            result(null, res.insertId);
        }
    });
};

creditSchema.getListing = async function (obj, result) {
    let skip = obj.skip;
    let limit = obj.limit;
    let userId = obj.userId
    sql("SELECT COUNT(*) as totalItem from  fw_payment where user_id =?", userId, function (err, count) {
        sql("SELECT * from fw_payment where user_id=" + userId + " ORDER BY id DESC LIMIT " + skip + "," + limit, function (err, res) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { transactions: res, count: count });
            }
        });
    })

};


const creditJoiSchema = {
    code: Joi.string().trim().min(2).max(50).required(),
    payment_method: Joi.string().valid('paypal', 'skrill').required(),
    coupon_code: Joi.string().trim().allow(''),
    auth_token: Joi.string().required(),
    unit: Joi.string().trim().required(),
    qty: Joi.number().required(),
    cost: Joi.number().required(),
    discount: Joi.number(),
    transaction_code: Joi.string().trim().allow(''),
    admin_note: Joi.string().trim().allow(''),
    status: Joi.string().valid('Y', 'N').required(),
}

//validate user signup
function validateTransactionData(credit) {
    return Joi.validate(credit, creditJoiSchema, { allowUnknown: true });
}

module.exports.validateTransactionData = validateTransactionData;
module.exports.creditSchema = creditSchema;