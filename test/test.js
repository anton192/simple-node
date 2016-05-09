var assert = require('assert');;
var DB = require('../server.js');
var config = require('../config.js');
var io = require('socket.io-client')

describe('Testing DB connection', function() {
	it('Creating DB structure', function(done) {
		DB.create(done);
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


	describe('Testing  session functionality', function() {

		it('[getSession] String, 32 sym', function(done) {

			socket.on('message', function (msg) { 
				if (msg.type == 'data' && msg.data.session.length == 32) {
				} else {
     				assert.equal(msg.type, 'data');
				}
 				done();
	     	});
	     	socket.send({ action: 'getSession', id: 1 });
		});

		it('[getSession] 2 times 1 value', function(done) {
			socket.on('message', function (msg) { 
				var session1 = msg.data.session;
				socket.on('message', function (msg) { 
					var session2 = msg.data.session;
					assert.equal(session1, session2);
					done();
		     	});
		     	socket.send({ action: 'getSession', id: 2 });
	     	});
	     	socket.send({ action: 'getSession', id: 1 });
		});

		it('[setSession] create & set & get session', function(done) {

			var session = '123';
			DB.execute('INSERT INTO sessions VALUES (null, '+session+', now());', function() {
				socket.on('message', function (msg) { 
					socket.on('message', function (msg) { 
						assert.equal(session, msg.data.session);
						done();
			     	});
			     	socket.send({ action: 'getSession', id: 2 });
		     	});
		     	socket.send({ action: 'setSession', data: { session: session }, id: 1 });
			});
		});

		it('[setSession] No session', function(done) {
			var session = 'qwerty';
			socket.on('message', function (msg) { 
				if (msg.type == 'error')
					assert.equal('No session', msg.data.type);
				assert.equal('error', msg.type);
				done();
	     	});
	     	socket.send({ action: 'setSession', data: { session: session }, id: 1 });
		});

	});

	describe('Testing action functionality', function() {

		it('[aetAction] Simply adding action', function(done) {
			socket.on('message', function (msg) { 
				if (msg.type == 'data')
					assert.equal('Ok', msg.data.type);
				assert.equal('data', msg.type);
				done();
	     	});
	     	socket.send({ action: 'addAction', data: { object: 'object', xMin: 1, xMax: 2, yMin: 1, yMax: 2 }, id: 1 });
		});

		it('[addAction] Rate limit', function(done) {
			socket.on('message', function (msg) { 
				if (msg.id >= 3) {
					if (msg.type == 'error')
						assert.equal('RateLimit', msg.data.type);
					assert.equal('error', msg.type);
					done();
				}
	     	});

	     	for (var i = 1; i <= 4; i += 1)
	     		socket.send({ action: 'addAction', data: { object: 'object', xMin: 1, xMax: 3, yMin: 1, yMax: 2 }, id: i });
		});
	});
	

});
