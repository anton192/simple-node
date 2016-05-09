
var io = require('socket.io').listen(8081); 
var Client = require('mariasql');
var crypto = require('crypto');

io.sockets.on('connection', function (socket) {
	console.log('New connection ' + socket.id);
});


function mult(a, b) {

	var c = new Client({ 
		host: '127.0.0.1', 
		user: 'root', 
		password: '' 
	});

	if (a < b) {
		c.query('CREATE DATABASE paint;', function(err, rows) {
			if (err) console.log(err);
			else 	console.log(rows);
			c.query('USE paint;', function(err, rows) {
				if (err) console.log(err);
				else console.log(rows);
				return 1;
			});
		});
		return 0;
	} else {

	}


	c.query('CREATE DATABASE paint;', function(err, rows) {
		if (err)
			console.log(err);
		else 
			console.log(rows);
		c.end();


		if (a < b)
			return a * b
		if (a > b)
			return b * a;
		if (a > 10)
			return a * a;
		return b * b;
	});
}

module.exports = mult;