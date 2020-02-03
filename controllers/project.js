const config = require('config');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
//const upload = require('../helpers/upload');
const _ = require('lodash'); //js utility lib
const fs = require('fs');
const jwt = require('jsonwebtoken'); //generate json token
const validate = require('../interceptors/validate');
const bcrypt = require('bcryptjs'); // for password encryption

// Upload Drive to google Drive
const readline = require('readline');
const { google } = require('googleapis');
const multer = require('multer');
var storage = multer.memoryStorage()
var upload = multer({ storage: storage });
const stream = require('stream');

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'config/token.json';
const { client_secret, client_id, redirect_uris } = config.google_drive_api;

const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

// Check if we have previously stored a token.
fs.readFile(TOKEN_PATH, (err, token) => {
    //if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
});

const drive = google.drive({ version: 'v3', auth: oAuth2Client });



const express = require('express');
const controller = express.Router();

const {
    projectSchema,
    validateProject
} = require('../models/project');

const {
    userSchema
} = require('../models/user');
/**
 * get Project Type
 */
controller.post('/getProjectPackages', async (req, res) => {

    //get Project Type Details
    projectSchema.getProjectPackages(req.body.status, async function (err, projectPackage) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, projectPackages: projectPackage });

    });
});

/**
 * get Project Type
 */
controller.post('/addNewProject', validate(validateProject), async (req, res) => {
    // Fetch UserDetails using Auth Token
    var authToken = req.body.auth_token;
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }
        if (userDetails.length > 0) {
            let projectDetails = {
                project_name: req.body.project_name,
                project_topic: req.body.project_topic,
                project_type: req.body.project_type,
                quantity: req.body.quantity,
                word_count: req.body.word_count,
                project_details: req.body.project_details,
                additional_resources: req.body.additional_resources,
                project_package: req.body.project_package,
                project_cost: req.body.project_cost,
                choice_of_writers: req.body.choice_of_writers,
                writers_career: req.body.writers_career,
                writers_age: req.body.writers_age,
                writers_location: req.body.writers_location,
                user_id: userDetails[0].user_id
            };

            var newProject = new projectSchema(projectDetails);
            //checking coupon code exists
            projectSchema.createProject(newProject, async function (err, newProject) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }

                // Update Account Balance of User


                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_ADDED });
            });
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT });
        }
    });
});



/**
 * Function to upload image on google drive and return uploaded path
 */
controller.post('/imageUploadtoBucket', function (req, file, res) {
    let fileObjects = file;
    //console.log(fileObjects)
    let files = [];
    if (fileObjects) {
        for (let fileObject in fileObjects) {
            let bufferStream = new stream.PassThrough();
            bufferStream.end(fileObject.buffer);
            gUpload(bufferStream, Date.now().toString() + '_' + fileObject.originalname, fileObject.mimetype).then(function (result) {
                files.push(result);
            }).catch(function (error) {
                console.log('error', error);
                /*res.status(500);
                res.send({
                  status: 500,
                  error: error,
                }); */
            });
        }

        console.log('files', files);
        //req.session.files = files;
        //next();
    } else {
        console.log("hello");
        //req.session.files = files;
        //next();
    }
});


// it will upload the file to googleDrive
async function gUpload(stream, filename, mimeType) {
    const res = await drive.files.create({
        requestBody: {
            name: filename,
            mimeType: mimeType,
            parents: [config.google_drive_api.folder_id],
        },
        media: {
            mimeType: mimeType,
            body: stream,
        },
    });
    return res.data;
}





module.exports = controller;