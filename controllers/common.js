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
	userSchema
} = require('../models/user');

const {
	supportSchema
} = require('../models/support');

const {
	projectSchema,
	projectFileSchema,
	projectStatusSchema,
	validateProject
} = require('../models/project');

const aws = require('aws-sdk');
aws.config.update({
	secretAccessKey: config.get('aws.secretKey'),
	accessKeyId: config.get('aws.accessKey'),
	region: config.get('aws.region')
});
const s3 = new aws.S3();

/**
 * Function to upload image on aws s3 bucket and return uploaded path
 */
const singleUpload = upload.single('file')
controller.post('/imageUploadtoBucket', function (req, res) {
	singleUpload(req, res, function (err) {
		if (err) {
			//console.log('error', err);
			return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_UPLOAD_DOC });
		}

		return res.status(def.API_STATUS.SUCCESS.OK).send({
			response: msg.RESPONSE.DOC_UPLOAD_SUCCESSFULLY,
			fileLocation: req.file.location,
			fileKey: req.file.key,
			fileName: req.file.originalname,
			fileMimeType: req.file.mimetype
		});
	});
});

/**
 * Function to delete object from aws s3 bucket
 */
controller.post('/deleteObject', function (req, res) {

	let params = {
		Bucket: config.get('aws.bucket'),
		Key: req.body.fileKey
	};


	s3.headObject(params, function (err, data) {

		if (err) {
			return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FILE_NOT_FOUND });
		} else {
			s3.deleteObject(params, function (err, data) {
				if (err) {
					return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: err.messege });
				} else {
					return res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.DOC_REMOVE_SUCCESSFULLY });
				}
			});
		}
	});
});

controller.post('/getUserCredits', async (req, res) => {

	let authToken = req.headers['x-auth-token'];
	//checking user id exists
	userSchema.fetchUserByAuthToken(authToken, async function (err, user) {
		if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY }); }

		// if User ID exist in the system
		if (user.length > 0) {
			res.status(def.API_STATUS.SUCCESS.OK).send({ response: msg.RESPONSE.SUCCESS_FETCH_DETAILS, available_credits: (user[0].account_balance == null) ? 0 : user[0].account_balance });
		} else {
			return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY });
		}

	});
});


controller.post('/getDashboardContent', async (req, res) => {
	//console.log('headers', req.headers);

	let authToken = req.headers['x-auth-token'];
	//checking user id exists
	userSchema.fetchUserByAuthToken(authToken, async function (err, user) {
		if (err) { return res.status(def.API_STATUS.SERVER_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY }); }

		// if User ID exist in the system
		if (user.length > 0) {
			// get Latest Project of User
			//get Project Type Details
			projectSchema.getDashboardContent(user[0].user_id, async function (err, dashboardContent) {

				// get Support Ticket Details
				if (dashboardContent.latestSupport.length > 0) {

					supportSchema.getDirector(user[0].director_id, async function (err, director) {

						dashboardContent.latestSupport.forEach((element) => {
							let messages = [];
							supportSchema.getMessages(element.id, async function (err, message) {
								messages.push(message[0]);
								messages.push(message[message.length - 1]);
								element['messages'] = messages;
								element['director'] = director;


							})


						});
					});
				}

				// get Project Status Details
				if (dashboardContent.latestProject.length > 0) {
					dashboardContent.latestProject.forEach((element) => {

						projectStatusSchema.getProjectStatusById(element.id, async function (err, projectStatus) {

							element['projectStatus'] = projectStatus;

						})


					});
				}


				let show_name = (user[0].first_name) ? (user[0].first_name + ' ' + (user[0].last_name)) : user[0].user_name;

				setTimeout(() => {

					res.status(def.API_STATUS.SUCCESS.OK).send({
						response: msg.RESPONSE.SUCCESS_FETCH_DETAILS,
						show_name: show_name,
						latestProject: (dashboardContent.latestProject.length > 0) ? dashboardContent.latestProject : [],
						latestSupport: (dashboardContent.latestSupport.length > 0) ? dashboardContent.latestSupport : [],
						latestFeedbacks: dashboardContent.latestFeedbacks,
						projectCount: (dashboardContent.projectCount.length > 0) ? dashboardContent.projectCount[0] : {}
					});

				}, 1000)
			});




		} else {
			return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send({ response: msg.RESPONSE.FAILED_TO_VERIFY });
		}

	});
});

module.exports = controller;