var assert = require('assert');;
var DB = require('../server.js');
var config = require('../config.js');
var io = require('socket.io-client')


describe('Testing DB connection', function() {
	
	it('Creating DB', function(done) {
		DB.execute('CREATE DATABASE paint;', done);
	});

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

	describe('Testing session functionality', function() {

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
			DB.execute('INSERT INTO sessions VALUES (null, "123", now());', function() {
				socket.on('message', function (msg) { 
					socket.on('message', function (msg) { 
						assert.equal(session, msg.data.session);
						done();
			     	});
			     	socket.send({ action: 'getSession', id: 2 });
		     	});
		     	socket.send({ action: 'setSession', data: { session: '123' }, id: 1 });
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

		it('[addAction] Simply adding action', function(done) {
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

		it('[removeAction] Add & remove my action', function(done) {
			socket.on('message', function (msg) { 
				if (msg.id == 1) {
					socket.send({ action: 'removeAction', data: { id: msg.data.id }, id: 2 });
				}
				if (msg.id == 2) {
					if (msg.type == 'data')
						assert.equal('Ok', msg.data.type);
					assert.equal('data', msg.type);
					done();
				}
	     	});
			socket.send({ action: 'addAction', data: { object: 'object', xMin: 1, xMax: 2, yMin: 1, yMax: 2 }, id: 1 });
		});

		it('[removeAction] Add & change session & try remove', function(done) {
			var actionId = null;
			socket.on('message', function (msg) { 
				if (msg.id == 1) {
					actionId = msg.data.id;
					socket.send({ action: 'setSession', data: { session: "123" }, id: 2 });
				}
				if (msg.id == 2) {
					socket.send({ action: 'removeAction', data: { id: actionId }, id: 3 });
				}
				if (msg.id == 3) {
					if (msg.type == 'error')
						assert.equal('No actual actions', msg.data.type);
					assert.equal('error', msg.type);
					done();
				}
	     	});
			socket.send({ action: 'addAction', data: { object: 'object', xMin: 1, xMax: 2, yMin: 1, yMax: 2 }, id: 1 });
		});

		it('[getMyActions] Change session & add action & get all actions', function(done) {
			socket.on('message', function (msg) { 
				if (msg.id == 1) {
					socket.send({ action: 'addAction', data: { object: 'object', xMin: 1, xMax: 3, yMin: 1, yMax: 2 }, id: 2 });
				}
				if (msg.id == 2) {
					socket.send({ action: 'getMyActions', data: { timeStart: 0, timeEnd: 2000000000000 }, id: 3 });
				}
				if (msg.id == 3) {
					if (msg.type == 'data')
						assert.equal(1, msg.data.length);
					assert.equal('data', msg.type);
					done();
				}
	     	});
			socket.send({ action: 'setSession', data: { session: "123" }, id: 1 });
		});

		it('[getAreaActions] Change session & add actions & get all in area', function(done) {
			socket.on('message', function (msg) { 
				if (msg.id == 1) {
					socket.send({ action: 'addAction', data: { object: 'object', xMin: 101, xMax: 102, yMin: 101, yMax: 102 }, id: 2 });
				}
				if (msg.id == 2) {
					socket.send({ action: 'addAction', data: { object: 'object', xMin: 102, xMax: 103, yMin: 101, yMax: 102 }, id: 3 });
				}
				if (msg.id == 3) {
					socket.send({ action: 'addAction', data: { object: 'object', xMin: 104, xMax: 105, yMin: 101, yMax: 102 }, id: 4 });
				}
				if (msg.id == 4) {
					socket.send({ action: 'getAreaActions', data: { xMin: 101, xMax: 103, yMin: 100, yMax: 102, timeStart: 0, timeEnd: 2000000000000 }, id: 5 });
				}
				if (msg.id == 5) {
					if (msg.type == 'data')
						assert.equal(2, msg.data.length);
					assert.equal('data', msg.type);
					done();
				}
	     	});
			socket.send({ action: 'setSession', data: { session: "123" }, id: 1 });
		});
	});
	

});
