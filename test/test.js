var assert = require('assert');
var mult = require('../server.js');
var io = require('socket.io-client')

describe('Mult', function() {
	it('a < b', function() {
		assert.equal(mult(2, 3), 6);
	});
});

describe('Socket', function() {

	var socket;

	beforeEach(function(done) {
		socket = io.connect('http://localhost:8081', {
            'reconnection delay' : 0, 
            'reopen delay' : 0, 
            'force new connection' : true
        });
        socket.on('connect', function() {
            console.log('worked...');
            done();
        });
        socket.on('disconnect', function() {
            console.log('disconnected...');
        });
	});


	afterEach(function(done) {
        if(socket.connected) {
            console.log('disconnecting...');
            socket.disconnect();
        } else {
            console.log('no connection to break...');
        }
        done();
    });

    it('Simple', function(done) {
    	socket.on('message', function (msg) { 
    		 assert.equal(msg.c, 3);
    		 done();
    	});
    	socket.send({ a: 1, b: 2 });
    });

});
