/* const multer = require('multer');
const config = require('config');
var isBase64 = require('is-base64');
var hummus = require('hummus');
const { google } = require('googleapis');
const auth = new google.auth.JWT({
    email: '...',
    key: '...',
    scopes: ['https://www.googleapis.com/auth/drive'],
});

const fileFilter = (req, file, cb) => {
    console.log('mimetype', file.mimetype);
    if (file.mimetype === 'application/pdf') {
        let pdfBase64String = req.body.base64StringFile;
        if (isBase64(pdfBase64String)) {
            let bufferPdf;
            try {
                bufferPdf = Buffer.from(pdfBase64String, 'base64');
                const pdfReader = hummus.createReader(new hummus.PDFRStreamForBuffer(bufferPdf));
                var pages = pdfReader.getPagesCount();
                if (pages > 0) {
                    console.log("Seems to be a valid PDF!");
                    cb(null, true);
                }
                else {
                    console.log("Unexpected outcome for number o pages: '" + pages + "'");
                    cb(new Error('The file is corrupted. Kindly choose other file.'), false);
                }
            }
            catch (err) {
                console.log("ERROR while handling buffer of pdfBase64 and/or trying to parse PDF: " + err);
                cb(new Error('The file is corrupted. Kindly choose other file.'), false);
            }
        } else {
            cb(new Error('The file is corrupted. Kindly choose other file.'), false);
        }
    } else {
        cb(new Error('Invalid file type, only JPG, JPEG ,PNG and PDF is allowed!'), false);
    }
}


const upload = multer({
    fileFilter,
    storage: multerDrive(auth),
    // Rest of multer's options
});


module.exports = upload; */

