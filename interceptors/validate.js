const def = require('../models/def/statuses');

module.exports = (validator) => {
    return (req, res, next) => {
        const {
            error
        } = validator(req.body);
        if (error) return res.status(def.API_STATUS.CLIENT_ERROR.BAD_REQUEST).send(error.details[0].message);
        next();
    }
}