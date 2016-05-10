
var io = require('socket.io').listen(8081); 
var Client = require('mariasql');
var crypto = require('crypto');
var config = require('./config.js');
var Promise = require('bluebird');

Client.prototype.end = function() {
	this._reusableAfterClose = false;
	this._closeOnEmpty = true;
};

var c = new Client({ 
	host: config.host,
	user: config.user,
	password: config.password
});

Promise.promisifyAll(c);


var sessions = [];
var Nlimit = 3; // operations in second
var limit = [];

function createDBStructure(done) {
	c.queryAsync('DROP DATABASE IF EXISTS paint;')
		.then(function() { c.queryAsync('CREATE DATABASE paint;'); })
		.then(function() { c.queryAsync('USE paint;'); })
		.then(function() { c.queryAsync('CREATE TABLE sessions(' +
											'id INT(5) NOT NULL AUTO_INCREMENT,' +
											'code VARCHAR(128),' +
											'begin DATETIME,' +
											'PRIMARY KEY(id)' +
										');'); })
		.then(function() { c.queryAsync('CREATE TABLE actions(' +
											'id INT(5) NOT NULL AUTO_INCREMENT,' +
											'object VARCHAR(1024),' +
											'session VARCHAR(128),' +
											'xMin DOUBLE,' +
											'xMax DOUBLE,' +
											'yMin DOUBLE,' +
											'yMAX DOUBLE,' +
											'time DOUBLE,' +
											'PRIMARY KEY(id)' + 
										');'); })
		.then(done);
};

function executeDB(query, done) {
	c.query(query, function(err, rows) {
		done();
	});
};

io.sockets.on('connection', function (socket) {
	if (config.server_log_level >= 1)
		console.log('New connection ' + socket.id);
	c.query('USE paint;');

	sessions[socket.id] = crypto.createHash('md5').update(Date.now() + '').digest('hex');
	c.query('INSERT INTO sessions VALUES (null, ?, now());', [sessions[socket.id]]);
	limit[socket.id] = Array(Nlimit + 1).join('0').split('');


	socket.on('message', function (query) {
		if (config.server_log_level >= 2)
			console.log('New message ' + query.action);

		if (query.action == 'getSession') {
			if (sessions[socket.id]) {
				socket.json.send({ action: 'getSession', type: 'data', data: { session: sessions[socket.id] }, id: query.id });
			} else {
				sessions[socket.id] = crypto.createHash('md5').update(Date.now() + '').digest('hex');
				c.query('INSERT INTO sessions VALUES (null, ?, now());', [sessions[socket.id]], function(err, rows) {
					if (err) {
						socket.json.send({ action: 'getSession', type: 'error', data: { type: 'DB', error: err }, id: query.id });	
					} else {
						socket.json.send({ action: 'getSession', type: 'data', data: { session: sessions[socket.id] }, id: query.id });
					}
				});
			}
		}

		if (query.action == 'setSession') {
			c.query('SELECT COUNT(*) as count FROM sessions WHERE code = ?;', [query.data.session], function (err, rows) {
				if (err) {
					socket.json.send({ action: 'setSession', type: 'error', data: { type: 'DB', error: err }, id: query.id });
				} else {
					if (rows[0]['count'] == 0) {
						socket.json.send({ action: 'setSession', type: 'error', data: { type: 'No session' }, id: query.id });
					} else {
						sessions[socket.id] = query.data.session;
						socket.json.send({ action: 'setSession', type: 'data', data: { type: 'Ok' }, id: query.id });
					}
				}
			});
		} 

		if (query.action == 'removeAction') {
			c.query('DELETE FROM actions WHERE id = ? AND session = ?;', [query.data.id, sessions[socket.id]], function(err, rows) {
				if (err) {
					socket.json.send({ action: 'removeAction', type: 'error', data: { type: 'DB', error: err }, id: query.id });
				} else {
					if (rows.info.affectedRows == 0) {
						socket.json.send({ action: 'removeAction', type: 'error', data: { type: 'No actual actions' } , id: query.id});
					} else {
						socket.json.send({ action: 'removeAction', type: 'data', data: { type: 'Ok' } , id: query.id});
					}
				}
			});
		}

		if (query.action == 'addAction') {
			if (config.server_log_level >= 3)
				console.log(limit[socket.id]);
			if (limit[socket.id][Nlimit - 1] && Date.now() - limit[socket.id][Nlimit - 1] <= 1000) {
				socket.json.send({ action: 'addAction', type: 'error', data: { type: 'RateLimit' } , id: query.id});
			} else {
				limit[socket.id] = limit[socket.id].map(function(item, i) { return limit[socket.id][i-1]; });
				limit[socket.id][0] = Date.now();
				query.data.session = sessions[socket.id];
				query.data.now = Date.now();
				c.query('INSERT INTO actions VALUES(null, :object, :session, :xMin, :xMax, :yMin, :yMax, :now);', query.data, function(err, rows) {
					if (err) {
						socket.json.send({ action: 'addAction', type: 'error', data: { type: 'DB', error: err } , id: query.id});
					} else {
						socket.json.send({ action: 'addAction', type: 'data', data: { type: 'Ok', id: rows.info.insertId } , id: query.id});
					}
				});	
			}
		}

		if (query.action == 'getMyActions') {
			c.query('SELECT * FROM actions WHERE session = ? AND time >= ? AND time <= ?;', [sessions[socket.id], query.data.timeStart, query.data.timeEnd], function(err, rows) {
				if (err) {
					socket.json.send({ action: 'getMyActions', type: 'error', data: { type: 'DB', error: err } , id: query.id});
				} else {
					socket.json.send({ action: 'getMyActions', type: 'data', data: rows , id: query.id});
				}
			});	
		}

		if (query.action == 'getAreaActions') {
			query.data.start = query.data.timeStart;
			query.data.end = query.data.timeEnd;
			c.query('SELECT object FROM actions WHERE ((:xMin <= xMin AND xmin <= :xMax) OR (:xMin <= xMax AND xMax <= :xMax)) AND ((:yMin <= yMin AND ymin <= :yMax) OR (:yMin <= yMax AND yMax <= :yMax)) AND time >= :start AND time <= :end;', query.data, function(err, rows) {
				if (err) {
					socket.json.send({ action: 'getAreaActions', type: 'error', data: { type: 'DB', error: err } , id: query.id});
				} else {
					socket.json.send({ action: 'getAreaActions', type: 'data', data: rows , id: query.id});
				}
			});
		}

	});


	socket.on('disconnect', function() {
		c.end();
	});
});

module.exports = {
	create: createDBStructure,
	execute: executeDB
};
