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

/**
 * Function to upload image on aws s3 bucket and return uploaded path
 */
const singleUpload = upload.single('file')
controller.post('/imageUploadtoBucket', function (req, res) {
	singleUpload(req, res, function (err) {
		if (err) {
			return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send({ response: msg.RESPONSE.FAILED_TO_UPLOAD_DOC });
		}
		//console.log(req)
		return res.status(def.API_STATUS.SUCCESS.OK).send({
            response: msg.RESPONSE.DOC_UPLOAD_SUCCESSFULLY,
			fileLocation: req.file.location,
			fileKey: req.file.key,
			fileName: req.file.originalname,
			fileMimeType: req.file.mimetype
		});
	});
});

module.exports = controller;