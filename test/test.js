var assert = require('assert');;
require('../server.js');
var io = require('socket.io-client')

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


});
