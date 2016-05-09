var assert = require('assert');;
var createDBStructure = require('../server.js');
var config = require('../config.js');
var io = require('socket.io-client')

describe('Testing DB connection', function() {
	it('Creating DB structure', function(done) {
		createDBStructure(done);
	});
});


describe('Testing server', function() {

	var socket;

	beforeEach(function(done) {
		socket = io.connect('http://localhost:8081', {
            'reconnection delay' : 0, 
            'reopen delay' : 0, 
            'force new connection' : true
        });
        socket.on('connect', function() {
            if (config.test_log_level >= 1)
            	console.log('worked...');
            done();
        });
        socket.on('disconnect', function() {
        	if (config.test_log_level >= 1)
            	console.log('disconnected...');
        });
	});


	afterEach(function(done) {
        if(socket.connected) {
        	if (config.test_log_level >= 1)
            	console.log('disconnecting...');
            socket.disconnect();
        } else {
        	if (config.test_log_level >= 1)
            	console.log('no connection to break...');
        }
        done();
    });



	describe('Testing get session functionality', function() {

		it('[getSession] String, 32 sym', function(done) {

			socket.on('message', function (msg) { 
				if (msg.type == 'data' && msg.data.session.length == 32) {
				} else {
     				assert.equal(msg.type, 'data');
				}
 				done();
	     	});
	     	socket.send({ action: 'getSession' });

		});

		it ('[getSession] 2 times 1 value', function(done) {
			socket.on('message', function (msg) { 
				var session1 = msg.data.session;
				socket.on('message', function (msg) { 
					var session2 = msg.data.session;
					assert.equal(session1, session2);
					done();
		     	});
		     	socket.send({ action: 'getSession' });
	     	});
	     	socket.send({ action: 'getSession' });
		});

	});
	

});
