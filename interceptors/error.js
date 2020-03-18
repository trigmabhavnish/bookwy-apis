const def = require('../models/def/statuses');
const winston = require('winston'); //logging library

module.exports = function (err, req, res, next) {
    // console.log(err);
    winston.error(err.message, err);
    //error,warn,info,verbos/debug,silly
    res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send('Unexpected error.');
}