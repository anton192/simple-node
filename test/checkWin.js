var assert = require('assert');
var mult = require('../server.js');
 
describe('Mult', function() {
	it('Simple test', function() {
		assert.equal(mult(2, 3), 6);
	});
});