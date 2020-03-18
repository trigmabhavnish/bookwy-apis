var config = require('config');
var mysql = require('mysql');

var sqlConnection = function sqlConnection(sql, values, next) {

    // It means that the values hasnt been passed
    if (arguments.length === 2) {
        next = values;
        values = null;
    }

    var connection = mysql.createConnection({
	  host: config.get('db.mysql.host'),
	  user: config.get('db.mysql.user'),
	  password: config.get('db.mysql.password'),
	  database: config.get('db.mysql.database'),
	  connectTimeout: 60000,
	});
	
    connection.connect(function(err) {
        if (err !== null) {
			//console.log('host', '60000')
            console.log("[MYSQL] Error connecting to mysql:" + err+'\n');
        }
		console.log("Connected!")
    });
	
	
	if(sql){
		connection.query(sql, values, function(err) {

			connection.end(); // close the connection

			if (err) {			
				throw err;
			}

			// Execute the callback
			next.apply(this, arguments);
		});
	}
    
}



module.exports = sqlConnection;

