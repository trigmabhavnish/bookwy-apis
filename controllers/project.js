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
    projectFileSchema,
    projectStatusSchema,
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
 * Add New Project
 */
controller.post('/addNewProject', validate(validateProject), async (req, res) => {


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

                let newProject = new projectSchema(projectDetails);

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

                        // Update File Data in project files table
                        let fileDetails;
                        if (req.body.project_files.length > 0) {
                            fileDetails = {
                                project_id: newProjectId,
                                user_id: userDetails[0].user_id,
                                file_path: req.body.project_files[0].file_path,
                                file_name: req.body.project_files[0].file_name,
                                file_key: req.body.project_files[0].file_key,
                                file_mimetype: req.body.project_files[0].file_mimetype,
                                file_category: req.body.project_files[0].file_category,
                            };
                        } else {
                            fileDetails = {
                                project_id: newProjectId,
                                user_id: userDetails[0].user_id,
                                file_path: '',
                                file_name: '',
                                file_key: '',
                                file_mimetype: '',
                                file_category: '',
                            };
                        }

                        let newProjectFiles = new projectFileSchema(fileDetails);
                        projectFileSchema.addProjectFiles(newProjectFiles, async function (err, newFileId) { });
                        // Update File Data in project files table

                        // Update Project Status in project status table
                        let projectStatusDetails = {
                            project_id: newProjectId,
                            user_id: userDetails[0].user_id,
                            project_status: 'New',
                            status_description: 'Project Created'
                        };

                        let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                        projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                        // Update Project Status in project status table

                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_ADDED });
                    });


                });
            }
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT });
        }
    });
});

/**
 * Update Project
 */
controller.post('/updateProject', async (req, res) => {


    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }
        if (userDetails.length > 0) {

            let lastProjectCost = req.body.lastProjectCost;
            let updatedProjectCost = lastProjectCost - req.body.project_cost;

            // check project cose is greater than available credits
            if (Math.abs(updatedProjectCost) > Math.abs(userDetails[0].account_balance)) {
                return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INSUFFICIENT_CREDITS });
            } else {
                let updatedProjectDetails = {
                    project_id: req.body.project_id,
                    project_name: req.body.project_name,
                    project_topic: req.body.project_topic,
                    project_type: req.body.project_type,
                    quantity: req.body.quantity,
                    word_count: req.body.word_count,
                    project_dtl: req.body.project_details,
                    additional_resources: req.body.additional_resources,
                    project_type_id: req.body.project_package,
                    project_cost: req.body.project_cost,
                    choice_of_writers: req.body.choice_of_writers,
                    writers_career: req.body.writers_career,
                    writers_age: req.body.writers_age,
                    writers_location: req.body.writers_location,
                    project_file: (req.body.project_files.length > 0) ? req.body.project_files[0].file_path : ''
                };



                projectSchema.updateProject(updatedProjectDetails, async function (err, updateProject) {
                    if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT }); }

                    // Update Account Balance of User
                    let updatedAccountBalance = ((Math.abs(userDetails[0].account_balance) + Math.abs(lastProjectCost)) - Math.abs(req.body.project_cost)).toFixed(2);

                    userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                        if (err) {

                            return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT });
                        }

                        // Update File Data in project files table
                        if (req.body.project_files[0].file_path) {
                            let fileDetails = {
                                project_id: req.body.project_id,
                                user_id: userDetails[0].user_id,
                                file_path: req.body.project_files[0].file_path,
                                file_name: req.body.project_files[0].file_name,
                                file_key: req.body.project_files[0].file_key,
                                file_mimetype: req.body.project_files[0].file_mimetype,
                                file_category: req.body.project_files[0].file_category,
                            };
                            projectFileSchema.updateProjectFiles(fileDetails, async function (err, updatedFile) { });

                        }
                        // Update File Data in project files table
                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_UPDATED });
                    });


                });
            }
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT });
        }
    });
});


/**
 * get Project Type
 */
controller.post('/cancelProject', async (req, res) => {


    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT }); }
        if (userDetails.length > 0) {

            projectSchema.cancelProject(req.body.project_id, async function (err, updateProject) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT }); }

                // Update Account Balance of User
                let updatedAccountBalance = (Math.abs(userDetails[0].account_balance) + Math.abs(req.body.project_cost)).toFixed(2);

                userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                    if (err) {

                        return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT });
                    }

                    // Update Project Status in project status table
                    let projectStatusDetails = {
                        project_id: req.body.project_id,
                        user_id: userDetails[0].user_id,
                        project_status: 'Cancel',
                        status_description: 'Project Cancelled'
                    };

                    let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                    projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                    // Update Project Status in project status table

                    // Update File Data in project files table
                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_CANCELLED });
                });


            });

        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT });
        }
    });
});

/**
 * get Project Listings
 */
controller.post('/getProjectListings', async (req, res) => {

    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    let skip = (parseInt(req.body.pageNumber) * parseInt(req.body.pageSize)) - parseInt(req.body.pageSize);
    let limit = parseInt(req.body.pageSize);

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER }); }
        if (userDetails.length > 0) {
            //get Project Listings Details

            let postData = { user_id: userDetails[0].user_id, skip: skip, limit: limit };
            projectSchema.getProjectListings(postData, async function (err, resp) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, projectListings: resp.projects, totalProjects: resp.count[0].totalProjects });

            });
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER });
        }
    });


});

/**
 * get Project Type
 */
controller.post('/getProjectDetailsById', async (req, res) => {

    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];    

    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER }); }
        if (userDetails.length > 0) {
            //get Project Listings Details

            let postData = { user_id: userDetails[0].user_id, proejct_id: req.body.projectId };
            projectSchema.getProjectDetailsById(postData, async function (err, projectDetails) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

                let projectStatusArray = [];
                projectStatusSchema.getProjectStatusById(req.body.projectId, async function (err, projectStatus) {
                    projectStatusArray = projectStatus;
                });

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, project_details: projectDetails[0], project_status:projectStatusArray });

            });
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_FIND_USER });
        }
    });


});






module.exports = controller;