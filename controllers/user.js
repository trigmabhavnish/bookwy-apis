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

const {
    projectSchema,
    projectFileSchema,
    projectStatusSchema,
    validateProject
} = require('../models/project');


const aws = require('aws-sdk');
aws.config.update({
    // Your SECRET ACCESS KEY from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.SECRET_ACCESS_KEY
    secretAccessKey: config.get('aws.secretKey'),
    // Not working key, Your ACCESS KEY ID from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.ACCESS_KEY_ID
    accessKeyId: config.get('aws.accessKey'),
    region: config.get('aws.region'), // region of your bucket
});

const s3 = new aws.S3();


/**
 * User Login, signup, Logout
 */
controller.post('/signup', validate(validateUser), async (req, res) => {
    var newUser = new userSchema(req.body);


    //checking user email already exists
    userSchema.checkEmailAlreadyExists(req.body.email, function (err, email) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

        // if Email Already Exists
        if (email.length > 0) {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.EMAIL_ALREADY_REGISTERED });
        }
        // Create New User
        else {
            userSchema.createUser(newUser, function (err, user) {


                if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

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
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

        // if Email Exists in the system
        if (user.length > 0) {
            /* Start Validate Password */
            const validPassword = await bcrypt.compare(req.body.password, user[0].password);
            console.log(req.body.password);
            console.log(user[0].password);
            if (!validPassword && (req.body.password != user[0].password)) return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_PASSWORD });

            /* End Validate Password */

            const authToken = await generateAuthToken(user[0]); // generate Auth Token
            const lastLogin = new Date();

            // Update Login Details
            if (user[0].auth_token == "") {


                userSchema.updateLoginDetails(user[0].user_id, lastLogin, authToken, function (err, updateUser) {

                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

                    // Login Successfully
                    res.setHeader('x-auth-token', authToken);
                    res.header('Access-Control-Expose-Headers', 'x-auth-token')

                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGGEDIN_SUCCESSFULLY, accountType: user[0].account_type });

                });

            } else {
                // Login Successfully
                res.setHeader('x-auth-token', user[0].auth_token);
                res.header('Access-Control-Expose-Headers', 'x-auth-token')

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGGEDIN_SUCCESSFULLY, accountType: user[0].account_type });
            }
        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_EMAIL });
        }

    });
});



/**
 * User Login, signup, Logout
 */
controller.post('/loginWithFb', async (req, res) => {
    var newUser = new userSchema(req.body);


    //checking user email already exists
    userSchema.checkEmailAlreadyExists(req.body.email, function (err, email) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

        // if Email Already Exists
        if (email.length > 0) {
            loginWithFb(req, res);            
        }
        // Create New User
        else {
            userSchema.createUser(newUser, function (err, user) {

                if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_REGISTER }); }

                loginWithFb(req, res);
                
            });
        }

    });
});


function loginWithFb(req, res) {
    userSchema.checkUserLogin(req.body.email, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

        // if Email Exists in the system
        if (user.length > 0) {

            /* End Validate Password */

            const authToken = await generateAuthToken(user[0]); // generate Auth Token
            const lastLogin = new Date();

            // Update Login Details
            if (user[0].auth_token == "" || user[0].auth_token == null) {


                userSchema.updateLoginDetails(user[0].user_id, lastLogin, authToken, function (err, updateUser) {

                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGIN }); }

                    // Login Successfully
                    res.setHeader('x-auth-token', authToken);
                    res.header('Access-Control-Expose-Headers', 'x-auth-token')
                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGGEDIN_SUCCESSFULLY, accountType: user[0].account_type });

                });

            } else {
                // Login Successfully
                res.setHeader('x-auth-token', user[0].auth_token);
                res.header('Access-Control-Expose-Headers', 'x-auth-token')

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGGEDIN_SUCCESSFULLY, accountType: user[0].account_type });
            }
        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INVALID_EMAIL });
        }

    });

}

controller.post('/forgotPassword', validate(validateEmail), async (req, res) => {

    //checking user email already exists
    userSchema.checkUserLogin(req.body.email, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

        // if Email Exists in the system
        if (user.length > 0) {

            const verifyToken = await generateAuthToken(user[0]); // generate Auth Token

            // Update Verification String in DB
            userSchema.updateVerificationToken(verifyToken, req.body.email, async function (err, updateVerifyToken) {

                const name = user[0].first_name + ' ' + user[0].last_name
                const forgotPasswordLink = config.get('webEndPointStaging') + '/user/reset-password?token=' + verifyToken;
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
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY }); }
        if (user.length > 0) {
            // delete Verification String in DB
            userSchema.deleteVerificationToken(req.body.verifyToken, async function (err, updateVerifyToken) { });

            res.status(def.API_STATUS.SUCCESS.OK).send({ response: true, user_id: user[0].user_id });

        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY });
        }

    });
});

controller.post('/resetPassword', validate(validateResetPassword), async (req, res) => {

    //checking user id exists
    userSchema.fetchUserById(req.body.user_id, async function (err, user) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.PASSWORD_UPDATE_ERROR }); }

        // if Email Exists in the system
        if (user.length > 0) {



            // Update Verification String in DB
            userSchema.resetPassword(req.body.password, req.body.user_id, async function (err, updatePassword) {

                if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.PASSWORD_UPDATE_ERROR }); }

                const name = user[0].first_name + ' ' + user[0].last_name

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

    // Fetch UserDetails using Auth Token
    var authToken = req.body.auth_token;

    //checking user email already exists
    userSchema.logout(authToken, function (err, logoutDetails) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_LOGOUT }); }
        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.LOGOUT_SUCCESSFULLY });
    });
});


controller.get('/getProfile', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {

            userSchema.fetchUserProfileById(userDetails[0].user_id, async function (err, profile) {
                if (err) {
                    return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_SAVED });
                }





                userSchema.fetchUserSettingById(userDetails[0].user_id, async function (err, settings) {
                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_SAVED }); }
                    else {

                        let profilePic = profile[0].profile_pic;
                        //console.log('hello', profile[0].profile_pic)
                        let completedFilePath = config.get('aws.bucket_url');
                        let completedFilePathLocal = 'assets/';
                        if (profilePic != "") {
                            var params = {
                                Bucket: config.get('aws.bucket'),
                                Key: profilePic
                            };

                            s3.headObject(params, function (err, metadata) {
                                //console.log('eer', err);
                                if (err && err.code === 'NotFound') {
                                    // Local File Path  
                                    profile[0].profile_pic = completedFilePathLocal + profilePic;
                                } else {
                                    // S3 File Path
                                    profile[0].profile_pic = completedFilePath + profilePic;
                                }
                            });

                        }

                        setTimeout(() => {
                            //console.log(profile);
                            res.status(def.API_STATUS.SUCCESS.OK).send({ profile: profile, settings: settings });
                        }, 2000);
                    }
                })

            })

        }
        else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: err });
        }

    })
})

/**
 * This is for updating profile image
 */

controller.post('/updateProfilePic', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {

            userSchema.updateProfileImage(userDetails[0].user_id, req.body, function (err, profile) {
                if (err)
                    return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: err });
                else
                    res.status(def.API_STATUS.SUCCESS.OK).send({ profile: profile });

            })
        }
    })
})

/**
 * This is for Updating Profile and settings form user end
 */
controller.post('/updateProfile', async (req, res) => {
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {

            //checking user email already exists
            if (req.body.email == userDetails[0].email) {
                userSchema.updateUserProfile(req.body, userDetails[0].user_id, async function (err, profile) {
                    if (err) {
                        return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_SAVED });
                    }

                    // Send User Notification
                    if (userDetails[0].my_profile == 'Y') {
                        let notificationMsg = msg.RESPONSE.NOTIFICATION_PROFILE_UPDATED;
                        projectSchema.saveNotification(notificationMsg, userDetails[0].user_id, async function (err, newFileId) { });
                    }
                    // Send User Notification


                    res.status(def.API_STATUS.SUCCESS.OK).send({ profile: profile });


                })
            } else {
                userSchema.checkEmailAlreadyExists(req.body.email, function (err, email) {
                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.EMAIL_ALREADY_REGISTERED }); }
                    //console.log(email);
                    if (email.length > 0) {
                        return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.EMAIL_ALREADY_REGISTERED });
                    } else {
                        userSchema.updateUserProfile(req.body, userDetails[0].user_id, async function (err, profile) {
                            if (err) {
                                return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_SAVED });
                            }


                            // Send User Notification
                            if (userDetails[0].my_profile == 'Y') {
                                let notificationMsg = msg.RESPONSE.NOTIFICATION_PROFILE_UPDATED;
                                projectSchema.saveNotification(notificationMsg, userDetails[0].user_id, async function (err, newFileId) { });
                            }
                            // Send User Notification

                            res.status(def.API_STATUS.SUCCESS.OK).send({ profile: profile });


                        })
                    }


                });
            }


        }
        else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: err });
        }

    })
})


/**
 * get All support Listing
 */
controller.post('/getNotifications', async (req, res) => {
    // Fetch UserDetails using Auth Token
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);
    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {
            userSchema.getNotifications({ skip: skip, limit: limit, user_id: userDetails[0].user_id }, async function (err, resp) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }



                res.status(def.API_STATUS.SUCCESS.OK).send({ totalItems: resp.count[0].totalItem, notifications: resp.notification, });
            })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }
    })


});
/**
 * get All support Listing
 */
controller.post('/notificationCount', async (req, res) => {
    // Fetch UserDetails using Auth Token

    var authToken = req.headers['x-auth-token'];

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {

        if (userDetails.length > 0) {
            userSchema.getNotificationCount({ user_id: userDetails[0].user_id }, async function (err, resp) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
                res.status(def.API_STATUS.SUCCESS.OK).send({ count: resp.count, });
            })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }
    })


});

/**
 * get All support Listing
 */
controller.post('/changePassword', async (req, res) => {
    // Fetch UserDetails using Auth Token
    var authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, async function (err, userDetails) {
        if (userDetails.length > 0) {
            userSchema.changePassword({ user_id: userDetails[0].user_id, password: req.body.password }, async function (err, resp) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err }); }
                res.status(def.API_STATUS.SUCCESS.OK).send({ response: resp });
            })
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err });
        }
    })


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
        expiresIn: "30d",
        algorithm: "RS256"
    };
    const token = jwt.sign({
        _id: user.user_id,
        user_name: user.user_name,
        account_type: user.account_type,
    }, privateKEY, signOptions);
    return token;
}

module.exports = controller;