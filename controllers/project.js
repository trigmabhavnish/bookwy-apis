const config = require('config');
const def = require('../models/def/statuses');
const msg = require('../models/def/responsemessages');
const upload = require('../helpers/upload');
const _ = require('lodash'); //js utility lib
const fs = require('fs');
const jwt = require('jsonwebtoken'); //generate json token
const validate = require('../interceptors/validate');
const bcrypt = require('bcryptjs'); // for password encryption
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

    console.log(req.body);
    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }
        if (userDetails.length > 0) {
            // check project cose is greater than available credits
            if (req.body.project_cost > userDetails[0].account_balance) {
                return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.INSUFFICIENT_CREDITS });
            } else {
                let projectDetails = {
                    project_code: req.body.project_code,
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
                    project_file: (req.body.project_files.length > 0) ? req.body.project_files[0].file_path : '',
                    user_id: userDetails[0].user_id
                };

                var newProject = new projectSchema(projectDetails);

                projectSchema.createProject(newProject, async function (err, newProjectId) {
                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }

                    // Update Account Balance of User
                    let updatedAccountBalance = (userDetails[0].account_balance - req.body.project_cost).toFixed(2);
                    userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                        if (err) {
                            // Delete Project
                            projectSchema.deleteProject(newProjectId, async function (err, deleteProject) { });
                            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT });
                        }

                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_ADDED });
                    });


                });
            }
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT });
        }
    });
});










module.exports = controller;