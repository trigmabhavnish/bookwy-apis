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
const aws = require('aws-sdk');

const {
    projectSchema,
    projectFileSchema,
    projectStatusSchema,
    validateProject
} = require('../models/project');

const {
    userSchema
} = require('../models/user');

const {
    sendMail
} = require('../helpers/emailService');


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
            /* if (req.body.project_cost > userDetails[0].account_balance) {
                return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.INSUFFICIENT_CREDITS });
            } else { */

            let projectStatus = (req.body.project_cost > userDetails[0].account_balance) ? 'Draft' : 'New';
            //console.log(projectStatus);    
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
                project_status: projectStatus,
                project_file: (req.body.project_files.length > 0) ? req.body.project_files[0].file_key : '',
                user_id: userDetails[0].user_id
            };

            let newProject = new projectSchema(projectDetails);

            projectSchema.createProject(newProject, async function (err, newProjectId) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }


                if (projectStatus == 'New') {
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
                            status_class: 'new__status',
                            status_description: 'Project Created'
                        };

                        let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                        projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                        // Update Project Status in project status table

                        // Send Email to User
                        const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                        const mailBody = {
                            to: userDetails[0].email,
                            from: config.get('fromEmail'),
                            subject: "Project Created",
                            template_id: config.get('email_templates.project_updates_template'),
                            dynamic_template_data: {
                                name: name,
                                project_name: req.body.project_name,
                                project_updates: 'Your project has been successfully created'
                            }
                        }
                        sendMail(mailBody)
                        // Send Email to User


                        // Send User Notification
                        if (userDetails[0].new_project == 'Y') {
                            let notificationMsg = msg.RESPONSE.NOTIFICATION_PROJECT_CREATED;
                            projectSchema.saveNotification(notificationMsg, userDetails[0].user_id, async function (err, newFileId) { });
                        }
                        // Send User Notification

                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_ADDED });
                    });

                } else {
                    // Project Set To Draft

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
                        project_status: 'Draft',
                        status_class: 'draft__status',
                        status_description: 'Project Drafted'
                    };
                    let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                    projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                    // Update Project Status in project status table

                    // Send Email to User
                    /*const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                    const mailBody = {
                        to: userDetails[0].email,
                        from: config.get('fromEmail'),
                        subject: "Project Created",
                        template_id: config.get('email_templates.project_updates_template'),
                        dynamic_template_data: {
                            name: name,
                            project_name: req.body.project_name,
                            project_updates: 'Your project has been successfully created'
                        }
                    }
                    sendMail(mailBody) */
                    // Send Email to User

                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_DRAFTED });

                }



            });
            /* } */
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
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_ADD_PROJECT }); }
        if (userDetails.length > 0) {

            let lastProjectCost = req.body.lastProjectCost;
            let lastProjectStatus = req.body.lastProjectStatus;
            let updatedProjectCost = lastProjectCost - req.body.project_cost;

            // check project cose is greater than available credits
            if (Math.abs(req.body.project_cost) > Math.abs(userDetails[0].account_balance)) {
                return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INSUFFICIENT_CREDITS });
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
                    project_file: (req.body.project_files.length > 0) ? req.body.project_files[0].file_key : ''
                };



                projectSchema.updateProject(updatedProjectDetails, async function (err, updateProject) {
                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT }); }

                    // Update Account Balance of User
                    let updatedAccountBalance;
                    if(lastProjectStatus == "Draft"){
                        updatedAccountBalance = (Math.abs(userDetails[0].account_balance) - Math.abs(req.body.project_cost)).toFixed(2);


                        // Update Project Status in project status table
                        let projectStatusDetails = {
                            project_id: req.body.project_id,
                            user_id: userDetails[0].user_id,
                            project_status: 'New',
                            status_class: 'new__status',
                            status_description: 'Project Created.'
                        };

                        let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                        projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                        // Update Project Status in project status table

                    }else{
                        updatedAccountBalance = ((Math.abs(userDetails[0].account_balance) + Math.abs(lastProjectCost)) - Math.abs(req.body.project_cost)).toFixed(2);
                    }
                    

                    userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                        if (err) {

                            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT });
                        }

                        // Update File Data in project files table
                        if (req.body.project_files.length > 0) {
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
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT });
        }
    });
});


/**
 * Cancel Project
 */
controller.post('/cancelProject', async (req, res) => {


    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT }); }
        if (userDetails.length > 0) {

            
            if (req.body.project_status == 'New' || req.body.project_status == 'Resume' || req.body.project_status == 'Pause') {
                // Update Account Balance of User
                let updatedAccountBalance = (Math.abs(userDetails[0].account_balance) + Math.abs(req.body.project_cost)).toFixed(2);
                
                userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                    if (err) {
                        return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT });
                    }
                    projectSchema.cancelProject(req.body.project_id, async function (err, updateProject) {
                        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT }); }


                        // Update Project Status in project status table
                        let projectStatusDetails = {
                            project_id: req.body.project_id,
                            user_id: userDetails[0].user_id,
                            project_status: 'Cancel',
                            status_class: 'cancel__status',
                            status_description: 'Project Cancelled'
                        };

                        let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                        projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                        // Update Project Status in project status table

                        // Send Email to User
                        const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                        const mailBody = {
                            to: userDetails[0].email,
                            from: config.get('fromEmail'),
                            subject: "Project Cancelled",
                            template_id: config.get('email_templates.project_updates_template'),
                            dynamic_template_data: {
                                name: name,
                                project_name: updateProject[0].project_name,
                                project_updates: 'Your project has been successfully cancelled.'
                            }
                        }
                        sendMail(mailBody)
                        // Send Email to User

                        // Update File Data in project files table
                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_CANCELLED });


                    });
                });
            } else {
                projectSchema.cancelProject(req.body.project_id, async function (err, updateProject) {
                    if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT }); }


                    // Update Project Status in project status table
                    let projectStatusDetails = {
                        project_id: req.body.project_id,
                        user_id: userDetails[0].user_id,
                        project_status: 'Cancel',
                        status_class: 'cancel__status',
                        status_description: 'Project Cancelled'
                    };

                    let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                    projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                    // Update Project Status in project status table

                    // Send Email to User
                    const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                    const mailBody = {
                        to: userDetails[0].email,
                        from: config.get('fromEmail'),
                        subject: "Project Cancelled",
                        template_id: config.get('email_templates.project_updates_template'),
                        dynamic_template_data: {
                            name: name,
                            project_name: updateProject[0].project_name,
                            project_updates: 'Your project has been successfully cancelled.'
                        }
                    }
                    sendMail(mailBody)
                    // Send Email to User

                    // Update File Data in project files table
                    res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_CANCELLED });


                });
            }



        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_CANCEL_PROJECT });
        }
    });
});


/**
 * Update Project Status
 */
controller.post('/updateProjectStatus', async (req, res) => {


    // Fetch UserDetails using Auth Token
    let authToken = req.headers['x-auth-token'];
    //Verify User 
    userSchema.fetchUserByAuthToken(authToken, function (err, userDetails) {
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT_STATUS }); }
        if (userDetails.length > 0) {

            // Update Account Balance of User
            if (req.body.project_status == "New") {
                if (req.body.project_cost > userDetails[0].account_balance) {
                    return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.INSUFFICIENT_CREDITS });
                } else {
                    let updatedAccountBalance = (userDetails[0].account_balance - req.body.project_cost).toFixed(2);
                    userSchema.updateUserAccountBalance(updatedAccountBalance, userDetails[0].user_id, function (err, userUpdate) {
                        if (err) {
                            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT_STATUS });
                        }

                        // Send Email to User
                        const name = userDetails[0].first_name + ' ' + userDetails[0].last_name
                        const mailBody = {
                            to: userDetails[0].email,
                            from: config.get('fromEmail'),
                            subject: "Project Created",
                            template_id: config.get('email_templates.project_updates_template'),
                            dynamic_template_data: {
                                name: name,
                                project_name: req.body.project_name,
                                project_updates: 'Your project has been successfully created.'
                            }
                        }
                        sendMail(mailBody)
                        // Send Email to User                        
                    });
                }
            }


            projectSchema.updateProjectStatus(req.body.project_id, req.body.project_status, async function (err, updateProject) {
                if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT_STATUS }); }


                // Update Project Status in project status table
                let statusDescription = "";
                let classStatus = "";

                if (req.body.project_status == "New") {
                    statusDescription = "Project Created.";
                    classStatus = "new__status";
                }
                if (req.body.project_status == "Pause") {
                    statusDescription = "Project Paused."
                    classStatus = "pause__status";
                }
                if (req.body.project_status == "Resume") {
                    statusDescription = "Project Resumed."
                    classStatus = "resume__status";
                }
                if (req.body.project_status == "Cancel") {
                    statusDescription = "Project Cancelled."
                    classStatus = "cancel__status";
                }
                if (req.body.project_status == "Complete") {
                    statusDescription = "Project Completed."
                    classStatus = "complete__status";
                }
                if (req.body.project_status == "Revised") {
                    statusDescription = "Project Revised."
                    classStatus = "revised__status";
                }


                let projectStatusDetails = {
                    project_id: req.body.project_id,
                    user_id: userDetails[0].user_id,
                    project_status: req.body.project_status,
                    status_class: classStatus,
                    status_description: statusDescription
                };

                let newProjectStatus = new projectStatusSchema(projectStatusDetails);
                projectStatusSchema.addProjectStatus(projectStatusDetails, async function (err, newStatusId) { });
                // Update Project Status in project status table

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.PROJECT_STATUS_UPDATED });


            });

        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_UPDATE_PROJECT_STATUS });
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
        if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }
        if (userDetails.length > 0) {
            //get Project Listings Details

            let postData = { user_id: userDetails[0].user_id, skip: skip, limit: limit };
            projectSchema.getProjectListings(postData, async function (err, resp) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }

                res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, projectListings: resp.projects, totalProjects: resp.count[0].totalProjects });

            });
        } else {
            return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS });
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
        if (err) { return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }
        if (userDetails.length > 0) {

            //console.log(userDetails);
            //get Project Listings Details

            let postData = { user_id: userDetails[0].user_id, project_id: req.body.projectId };
            //console.log(postData);
            projectSchema.getProjectDetailsById(postData, async function (err, projectDetails) {
                if (err) { return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS }); }
                
                const mergeProjectDetails = Object.assign(projectDetails.projectDetails[0],projectDetails.projectFiles[0]);

                
                let projectStatusArray = [];
                await projectStatusSchema.getProjectStatusById(req.body.projectId, async function (err, projectStatus) {

                    projectStatusArray = projectStatus;

                    let completedFilePath = config.get('aws.bucket_url');
                    let completedFilePathLocal = 'assets/';

                    
                    if (mergeProjectDetails.completed_project_file != '') {
                        var params = {
                            Bucket: config.get('aws.bucket'),
                            Key: mergeProjectDetails.completed_project_file
                        };

                        s3.headObject(params, function (err, metadata) {
                            if (err && err.code === 'NotFound') {
                                // Local File Path  
                                mergeProjectDetails.completed_project_file = completedFilePathLocal + mergeProjectDetails.completed_project_file;
                            } else {
                                // S3 File Path
                                mergeProjectDetails.completed_project_file = completedFilePath + mergeProjectDetails.completed_project_file;
                            }
                        });

                    }

                    if (mergeProjectDetails.project_file != "") {

                        var params = {
                            Bucket: config.get('aws.bucket'),
                            Key: mergeProjectDetails.project_file
                        };
                        s3.headObject(params, function (err, metadata) {
                            if (err && err.code === 'NotFound') {
                                // Local File Path  
                                mergeProjectDetails.project_file = completedFilePathLocal + mergeProjectDetails.project_file;
                            } else {
                                // S3 File Path
                                mergeProjectDetails.project_file = completedFilePath + mergeProjectDetails.project_file;
                            }
                        });
                    }

                    // Send Response
                    setTimeout(() => {
                        res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, project_details: mergeProjectDetails, project_status: projectStatusArray, user_account_balance: userDetails[0].account_balance });
                    }, 2000);


                });



            });
        } else {
            return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.UNABLE_TO_FETCH_DETAILS });
        }
    });


});






module.exports = controller;