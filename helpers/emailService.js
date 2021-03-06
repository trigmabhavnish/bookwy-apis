const config = require('config');
const webEndPoint = config.get('webEndPointProduction');

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.get('send_grid.secret_key'));



function sendMail(options) {
    //console.log(options)
    const msg = {
        to: options.to,
        from: config.get('fromEmail'),
        subject: options.subject,
        html: options.message,
    };
    sgMail.send(options).then().catch(e => {
        console.log('the error is ', e);
    })
}


module.exports.sendMail = sendMail;