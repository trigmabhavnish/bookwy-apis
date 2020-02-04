const express = require('express');
var path = require('path');

/**********************************************************************
 * Front Apis files
 * *********************************************************************** */
const user = require('../controllers/user');
const project = require('../controllers/project');
const coupon = require('../controllers/coupon');
const credit = require('../controllers/credit');
const common = require('../controllers/common');

//const googleapi = require('../init/googleapi');


module.exports = function (app) {
    app.use(express.json());

    app.use('*/js',express.static('public/js'));
    app.use('*/img',express.static('public/img'));
    app.use(function (req, res, next) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'x-auth-token,content-type');
        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });
    app.get('/',function(req,res){res.send('All Set');}) // Root URL
    app.use('/api/user', user);
    app.use('/api/project', project);
    app.use('/api/coupon', coupon);
    app.use('/api/credit', credit);
    app.use('/api/common', common);
}    