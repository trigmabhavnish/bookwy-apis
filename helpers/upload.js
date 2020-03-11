const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const config = require('config');
var hummus = require('hummus');
var isBase64 = require('is-base64');

aws.config.update({
    // Your SECRET ACCESS KEY from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.SECRET_ACCESS_KEY
    secretAccessKey: config.get('aws.secretKey'),
    // Not working key, Your ACCESS KEY ID from AWS should go here,
    // Never share it!
    // Setup Env Variable, e.g: process.env.ACCESS_KEY_ID
    accessKeyId: config.get('aws.accessKey'),
    region: config.get('aws.region'), // region of your bucket
});

const s3 = new aws.S3();

const fileFilter = (req, file, cb) => {
  if(file.mimetype === 'application/pdf'){
	  let pdfBase64String = req.body.base64StringFile;
	if(isBase64(pdfBase64String)){
		let bufferPdf;
			try {
			  bufferPdf = Buffer.from(pdfBase64String, 'base64');
			  const pdfReader = hummus.createReader(new hummus.PDFRStreamForBuffer(bufferPdf));
			  var pages = pdfReader.getPagesCount();
			  if(pages > 0) {
					console.log("Seems to be a valid PDF!");
				  cb(null, true);	
			  }
			  else {
				  console.log("Unexpected outcome for number o pages: '" + pages + "'");
				  cb(new Error('The file is corrupted. Kindly choose other file.'), false);
			  }
			}
			catch(err) {
			   console.log("ERROR while handling buffer of pdfBase64 and/or trying to parse PDF: " + err);
			   cb(new Error('The file is corrupted. Kindly choose other file.'), false);
			}
		}else{
			cb(new Error('The file is corrupted. Kindly choose other file.'), false);
		}
  } else {
	//cb(new Error('Invalid file type, only JPG, JPEG ,PNG and PDF is allowed!'), false);
	cb(null, true);
  }
}

const upload = multer({  
  limits: { fieldSize: 25 * 1024 * 1024 },
  storage: multerS3({
    acl: 'public-read',
    s3,
    bucket: config.get('aws.bucket'), 
    key: function (req, file, cb) {
		var extension = "jpg";
		if (file.mimetype == "image/png") extension = "png";		
		else if (file.mimetype == "image/jpeg") extension = "jpeg";
		else if (file.mimetype == "image/x-citrix-jpeg") extension = "jpeg";
		else if (file.mimetype == "application/pdf") extension = "pdf";
		else if (file.mimetype == "application/msword") extension = "doc";
		else if (file.mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document") extension = "docx";
		else if (file.mimetype == "text/csv") extension = "csv";
		else if (file.mimetype == "application/vnd.ms-excel") extension = "xls";
		else if (file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") extension = "xlsx";		
		else if (file.mimetype == "application/zip") extension = "zip";
		else if (file.mimetype == "application/x-rar-compressed" || file.mimetype == "application/vnd.rar"  || file.mimetype == "application/octet-stream") extension = "rar";
		else if (file.mimetype == "text/plain") extension = "txt";
		
		
      const folderName = (req.body.folder)?req.body.folder+'/':'';     
      //console.log('path:'+folderName+Date.now().toString());
      cb(null, folderName+Date.now().toString()+'.'+extension)
    },
    
  })
});


/**
 * check PDF Corrupted 
*/
/* controller.post('/checkPDFCorrupted', function(req, res) {  
	
	let pdfBase64String = req.body.base64string;
	if(isBase64(pdfBase64String)){
		let bufferPdf;
		try {
		  bufferPdf = Buffer.from(pdfBase64String, 'base64');
		  const pdfReader = hummus.createReader(new hummus.PDFRStreamForBuffer(bufferPdf));
		  var pages = pdfReader.getPagesCount();
		  if(pages > 0) {
				console.log("Seems to be a valid PDF!");
			  return res.status(def.API_STATUS.SUCCESS.OK).send(true);	
		  }
		  else {
			  console.log("Unexpected outcome for number o pages: '" + pages + "'");
			  return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send(false);
		  }
		}
		catch(err) {
		   console.log("ERROR while handling buffer of pdfBase64 and/or trying to parse PDF: " + err);
		   return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send(false);
		}
	}else{
		return res.status(def.API_STATUS.SERVER_ERROR.INTERNAL_SERVER_ERROR).send(false);
	}		
}) */

module.exports = upload;

