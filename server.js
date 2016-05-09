
var io = require('socket.io').listen(8081); 
var Client = require('mariasql');
var crypto = require('crypto');

var c = new Client({ 
	host: '127.0.0.1', 
	user: 'root', 
	password: 'root' 
});

var sessions = [];
var Nlimit = 3; // operations in second
var limit = [];


io.sockets.on('connection', function (socket) {
	console.log('New connection ' + socket.id);
	c.query('USE paint;');

	sessions[socket.id] = crypto.createHash('md5').update(Date.now() + '').digest('hex');
	c.query('INSERT INTO sessions VALUES (null, \'' + sessions[socket.id] + '\', now());');
	limit[socket.id] = Array(Nlimit + 1).join('0').split('');


	socket.on('message', function (query) {
		console.log('New message ' + query.action);

		if (query.action == 'getSession') {
			if (sessions[socket.id]) {
				socket.json.send({ action: 'getSession', type: 'data', data: { session: sessions[socket.id] } });
			} else {
				sessions[socket.id] = crypto.createHash('md5').update(Date.now() + '').digest('hex');
				c.query('INSERT INTO sessions VALUES (null, \'' + sessions[socket.id] + '\', now());', function(err, rows) {
					if (err) {
						socket.json.send({ action: 'getSession', type: 'error', data: { type: 'DB', error: err } });	
					} else {
						socket.json.send({ action: 'getSession', type: 'data', data: { session: sessions[socket.id] } });
					}
				});
			}
		}

		if (query.action == 'setSession') {
			c.query('SELECT COUNT(*) as count FROM sessions WHERE code = \'' + query.data.session + '\';', function (err, rows) {
				if (err) {
					socket.json.send({ action: 'setSession', type: 'error', data: { type: 'DB', error: err } });
				} else {
					if (rows[0]['count'] == 0) {
						socket.json.send({ action: 'setSession', type: 'error', data: { type: 'No session' } });
					} else {
						sessions[socket.id] = query.data.session;
						socket.json.send({ action: 'setSession', type: 'data', data: { type: 'Ok' } });
					}
				}
			});
		} 

		if (query.action == 'removeAction') {
			c.query('DELETE FROM actions WHERE id = ' + query.data.id + ' AND session = \'' + sessions[socket.id] + '\';', function(err, rows) {
				if (err) {
					socket.json.send({ action: 'removeAction', type: 'error', data: { type: 'DB', error: err } });
				} else {
					if (rows.info.affectedRows == 0) {
						socket.json.send({ action: 'removeAction', type: 'error', data: { type: 'No actual actions' } });
					} else {
						socket.json.send({ action: 'removeAction', type: 'data', data: { type: 'Ok' } });
					}
				}
			});
		}

		if (query.action == 'addAction') {
			console.log(limit[socket.id]);
			if (limit[socket.id][Nlimit - 1] && Date.now() - limit[socket.id][Nlimit - 1] <= 1000) {
				socket.json.send({ action: 'addAction', type: 'error', data: { type: 'RateLimit' } });
			} else {
				limit[socket.id] = limit[socket.id].map(function(item, i) { return limit[socket.id][i-1]; });
				limit[socket.id][0] = Date.now();
				c.query('INSERT INTO actions VALUES(null, :object, \'' + sessions[socket.id] + '\', :xMin, :xMax, :yMin, :yMax, ' + Date.now() + ');', query.data, function(err, rows) {
					if (err) {
						socket.json.send({ action: 'addAction', type: 'error', data: { type: 'DB', error: err } });
					} else {
						socket.json.send({ action: 'addAction', type: 'data', data: { type: 'ok' } });
					}
				});	
			}
		}

		if (query.action == 'getMyActions') {
			c.query('SELECT * FROM actions WHERE session = \'' + sessions[socket.id] + '\' AND time >= ? AND time <= ?;', [query.data.timeStart, query.data.timeEnd], function(err, rows) {
				if (err) {
					socket.json.send({ action: 'getMyActions', type: 'error', data: { type: 'DB', error: err } });
				} else {
					socket.json.send({ action: 'getMyActions', type: 'data', data: rows });
				}
			});	
		}

		if (query.action == 'getAreaActions') {
			c.query('SELECT object FROM actions WHERE ((:xMin <= xMin AND xmin <= :xMax) OR (:xMin <= xMax AND xMax <= :xMax)) AND ((:yMin <= yMin AND ymin <= :yMax) OR (:yMin <= yMax AND yMax <= :yMax)) AND time >= ' + query.data.timeStart + ' AND time <= ' + query.data.timeEnd + ';', query.data, function(err, rows) {
				if (err) {
					socket.json.send({ action: 'getAreaActions', type: 'error', data: { type: 'DB', error: err } });
				} else {
					socket.json.send({ action: 'getAreaActions', type: 'data', data: rows });
				}
			});
		}

	});


	socket.on('disconnect', function() {
		c.end();
	});
});
