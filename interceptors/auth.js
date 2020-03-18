const def = require('../models/def/statuses');
const jwt = require('jsonwebtoken');
//const config = require('config');
const winston = require('winston');
const fs = require('fs'); //file system

module.exports = function (req, res, next) {
    const token = req.header('x-auth-token');

    if (!token) return res.status(def.API_STATUS.CLIENT_ERROR.UNAUTHORIZED).send('Access denied. No token provided.');

    try {
        const publicKEY = fs.readFileSync('./config/keys/public.key', 'utf8');
        const i = 'writehero'; // Issuer 
        const s = 'info@writehero.com'; // Subject 
        const a = 'https://writehero.com/'; // Audience
        // SIGNING OPTIONS
        const verifyOptions = {
            issuer: i,
            subject: s,
            audience: a,
            expiresIn: "1h",
            algorithm: "RS256"
        };
        const decoded = jwt.verify(token, publicKEY, verifyOptions);
        req.user = decoded;
        next();
    } catch (e) {
        winston.error(e.message, e);
        res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send('Invalid token');
    }
}