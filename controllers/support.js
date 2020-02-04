const config = require('config');
const express = require('express');
const controller = express.Router();
const { creditSchema,validateTransactionData } = require('../models/credit');






module.exports = controller;