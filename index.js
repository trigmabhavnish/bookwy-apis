'use strict'
const config = require('config')
const winston = require('winston');
const express = require('express');
const app = express();

require('./init/errorhandling'); //logging library
require('./init/controllers')(app);
require('./init/mysqldb')();
require('./init/validation')();

const port = config.get('port') || 3001;
const server = app.listen(port, () => winston.info('API Started, listening on port ${port}...'));
module.exports = server;