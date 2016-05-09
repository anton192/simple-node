
var io = require('socket.io').listen(8081); 
var Client = require('mariasql');
var crypto = require('crypto');

io.sockets.on('connection', function (socket) {
	console.log('New connection ' + socket.id);

	socket.on('message', function (query) {
		console.log('New message ' + query.a + " " + query.b);

		if (query.a < query.b) {
			c = query.a + query.b;
		} else {
			c = query.b + query.a;
		}

		socket.json.send({ c: c })
	});
});


function mult(a, b) {

	var c = new Client({ 
		host: '127.0.0.1', 
		user: 'root', 
		password: '' 
	});

	return a * b;
}

module.exports = mult;