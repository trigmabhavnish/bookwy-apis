const winston = require('winston');

require('express-async-errors'); //wrap a route or pre handler run (run time)

module.exports = function () {
    try {
        winston.exceptions.handle(
            new winston.transports.Console({
                colorize: true,
                prettyPrint: true
            }),
            new winston.transports.File({
                filename: './logs/exceptions.log'
            })
        );

        process.on('unhandledRejection', (ex) => {
            throw (ex);
        });        

        winston.add(new winston.transports.File({ filename: './logs/logfile.log' }));
        
    } catch (e) {
        console.log(e);
    }


}