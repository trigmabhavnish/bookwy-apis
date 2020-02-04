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


/**
 * make payment 
 */
controller.post('/make-payment', async (req, res) => {
    let cred = {
        email:'sales@epicwrite.com',
        password:'8bcf2ad23abdc7f4b8e65efaadf71e19',
        amount:10,
        currency:'AED',
        subject:'suvject',
        note:'notes',
        transaction_id:'194573960'

    }

let url = `https://www.skrill.com/app/pay.pl?action=prepare&email=${cred.email}&password=${cred.password}
&amount=${cred.amount}&currency=${cred.currency}&subject=${cred.subject}&note=${cred.note}&frn_trn_id=my-frn-trn1&mb_transaction_id=${cred.transaction_id}`

})




module.exports = controller;