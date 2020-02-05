const config = require('config');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const _ = require('lodash'); //js utility lib
const fs = require('fs');
const jwt = require('jsonwebtoken'); //generate json token
const validate = require('../interceptors/validate');
const bcrypt = require('bcryptjs'); // for password encryption

const {
    sendMail
} = require('../helpers/emailService');

const express = require('express');
const controller = express.Router();
const {
    userSchema,
    validateUser,
    validateEmail,
    validateUserLogin,
    validateResetPassword,
} = require('../models/user');


/**
 * User Login, signup, Logout
 */
controller.post('/signup', validate(validateUser), async (req, res) => {
    var newUser = new userSchema(req.body);


    //checking user email already exists
    userSchema.checkEmailAlreadyExists(req.body.email, function (err, email) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

        // if Email Already Exists
        if (email.length > 0) {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.EMAIL_ALREADY_REGISTERED });
        }
        // Create New User
        else {
            userSchema.createUser(newUser, function (err, user) {
                console.log('user', user)

                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

                const name = req.body.first_name + ' ' + req.body.last_name

                const mailBody = {
                    to: req.body.email,
                    from: config.get('fromEmail'),
                    subject: "Welcome to Buywy",
                    template_id: config.get('email_templates.user_welcome_template'),
                    dynamic_template_data: {
                        name: name
                    }
                }
                sendMail(mailBody)

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_REGISTER });
            });
        }

    });
});

controller.post('/login', validate(validateUserLogin), async (req, res) => {

    //checking user email already exists
    userSchema.checkUserLogin(req.body.email, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

        // if Email Exists in the system
        if (user.length > 0) {
            /* Start Validate Password */
            const validPassword = await bcrypt.compare(req.body.password, user[0].password);

            if (!validPassword) return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_PASSWORD });

            /* End Validate Password */

            const authToken = await generateAuthToken(user); // generate Auth Token
            const lastLogin = new Date();

            // Update Login Details
            userSchema.updateLoginDetails(user[0].user_id, lastLogin, authToken, function (err, updateUser) {

                if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

                // Login Successfully
                res.setHeader('x-auth-token', authToken);
                res.header('Access-Control-Expose-Headers', 'x-auth-token')

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGGEDIN_SUCCESSFULLY, accountType: user[0].account_type });

            });
        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_EMAIL });
        }

    });
});

controller.post('/forgotPassword', validate(validateEmail), async (req, res) => {

    //checking user email already exists
    userSchema.checkUserLogin(req.body.email, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

        // if Email Exists in the system
        if (user.length > 0) {

            const verifyToken = await generateAuthToken(user); // generate Auth Token

            // Update Verification String in DB
            userSchema.updateVerificationToken(verifyToken, req.body.email, async function (err, updateVerifyToken) {

                const name = user[0].first_name + ' ' + user[0].last_name
                const forgotPasswordLink = config.get('webEndPointStaging') + '/user/reset-password?token=' + verifyToken;
                //console.log(forgotPasswordLink);
                const mailBody = {
                    to: req.body.email,
                    from: config.get('fromEmail'),
                    Subject: "Bookwy: Forgot Password",
                    template_id: config.get('email_templates.forgot_password_template'),
                    dynamic_template_data: {
                        forgotPasswordLink: forgotPasswordLink,
                        email: req.body.email,
                        name: name
                    }
                }
                await sendMail(mailBody);
                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.FORGOT_PASSWORD_RESPONSE });

            });


        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_EMAIL });
        }

    });
});

controller.post('/verifyAuthToken', async (req, res) => {

    //checking user auth token
    userSchema.verifyAuthToken(req.body.verifyToken, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_VERIFY }); }
        if (user.length > 0) {
            // delete Verification String in DB
            userSchema.deleteVerificationToken(req.body.verifyToken, async function (err, updateVerifyToken) { });

            res.status(def.API_STATUS.SUCCESS.OK).send({ response: true, user_id: user[0].user_id});

        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY });
        }

    });
});

controller.post('/resetPassword', validate(validateResetPassword), async (req, res) => {

    //checking user id exists
    userSchema.fetchUserById(req.body.user_id, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.PASSWORD_UPDATE_ERROR }); }

        // if Email Exists in the system
        if (user.length > 0) {

            

            // Update Verification String in DB
            userSchema.resetPassword(req.body.password, req.body.user_id, async function (err, updatePassword) {

                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.PASSWORD_UPDATE_ERROR }); }

                const name = user[0].first_name + ' ' + user[0].last_name
                
                //console.log(forgotPasswordLink);
                const mailBody = {
                    to: user[0].email,
                    from: config.get('fromEmail'),
                    Subject: "Bookwy: Reset Password Successfully.",
                    template_id: config.get('email_templates.reset_password_template'),
                    dynamic_template_data: {                        
                        email: user[0].email,
                        name: name
                    }
                }
                await sendMail(mailBody);

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PASSWORD_UPDATED });

            });


        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.PASSWORD_UPDATE_ERROR });
        }

    });
});

controller.post('/logout', async (req, res) => {

    //console.log(req.body);
    // Fetch UserDetails using Auth Token
    var authToken = req.body.auth_token;

    //checking user email already exists
    userSchema.logout(authToken, function (err, logoutDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_LOGOUT }); }
        //console.log(logoutDetails);
        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGOUT_SUCCESSFULLY });
    });
});

//function to generate jwt token
function generateAuthToken(user) {
    // PRIVATE and PUBLIC key    
    let privateKEY = fs.readFileSync('./config/keys/private.key');

    const i = 'writehero'; // Issuer 
    const s = 'info@writehero.com'; // Subject 
    const a = 'https://writehero.com'; // Audience
    // SIGNING OPTIONS
    const signOptions = {
        issuer: i,
        subject: s,
        audience: a,
        expiresIn: "1h",
        algorithm: "RS256"
    };
    const token = jwt.sign({
        _id: user[0].user_id,
        user_name: user[0].user_name,
        account_type: user[0].account_type,
    }, privateKEY, signOptions);
    return token;
}

module.exports = controller;