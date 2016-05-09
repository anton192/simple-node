var assert = require('assert');
var mult = require('../server.js');
 
describe('Mult', function() {
	it('a < b', function() {
		assert.equal(mult(2, 3), 6);
	});
	it('a > b', function() {
		assert.equal(mult(4, 3), 12);
	});
	it('a == b', function() {
		assert.equal(mult(5, 5), 25);
	});
});