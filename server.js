
var io = require('socket.io').listen(8081); 
var Client = require('mariasql');
var crypto = require('crypto');

function mult(a, b) {

	var c = new Client({ 
		host: '127.0.0.1', 
		user: 'root', 
		password: '' 
	});

	if (a < b)
		return a * b
	if (a > b)
		return b * a;
	if (a > 10)
		return a * a;
	return b * b;
}

module.exports = mult;