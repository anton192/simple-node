var assert = require('assert');
var mult = require('../server.js');
var io = require('socket.io-client')

describe('Mult', function() {
	it('a < b', function() {
		assert.equal(mult(2, 3), 1);
	});
});
