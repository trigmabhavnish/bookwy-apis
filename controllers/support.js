const config = require('config');
const express = require('express');
const controller = express.Router();
const { creditSchema,validateTransactionData } = require('../models/credit');
const {
    userSchema
} = require('../models/user');



/**
 * get Project Type
 */
controller.post('/getSupportTickets', async (req, res) => {
    // Fetch UserDetails using Auth Token
    var authToken = req.body.auth_token;
    console.log('the token is',authToken)
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }
        if (userDetails.length > 0) {
           
         console.log('THE USER  IS',userDetails);
         res.json({
             success:true
         })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT });
        }
    });
});


module.exports = controller;