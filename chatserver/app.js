var express = require('express'),
    app = express()
  , http = require('http')
  , request = require('request')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

io.set('log level', 2); // reduce logging

server.listen(3000);

// TODO: change me.
var approot = 'http://teleport.csail.mit.edu';

var calls = {};

var clients = [];

io.sockets.on('connection', function(client){

    var clientId = client.id;

    clients.push(client);

    client.on('announce', function(msg) {
        console.log("User " + msg.user_id + " announced." );
        client.set('user_id', msg.user_id, function() {
            console.log(client.id, "User " + msg.user_id + " announced." );
        });
    });

    client.on('initiate', function(msg) {
        var session_id = '';
        var res = {};
        request.post(
            approot + '/get_session',
            {},
            function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    res = JSON.parse(body);
                    calls[res.session_id] = {
                        'session_id': res.session_id,
                        'members': [],
                        'member_names': {},
                        'invited': [msg.initiator],
                        'leader':  msg.initiator,
                        'initiator': msg.initiator,
                        'buffer': [],
                        'timestamp': new Date()
                    };
                    client.emit('accepted', calls[res.session_id]);
                } else {
                    client.emit('error', {'error': 'Could not get session'});
                }
            }
        );
    });

    client.on('getLiveSessions', function(msg) {
        var userId = msg.user_id,
            user_calls = [],
            call = {};

        console.log('getLiveSessions', msg);
        console.log(calls);
        console.log(msg.user_id);

        for (var sessionId in calls) {
            call = calls[sessionId];
            if (call.members.indexOf(userId) > -1) {
                user_calls.push(call);
            }
        }

        console.log(user_calls);

        client.emit('sessionUpdate', user_calls);
    });


    client.on('join', function(msg) {

        var call_state = calls[msg.session_id],
            inviteIdx = -1,
            res = {};

        if (call_state) {

            inviteIdx = call_state.invited.indexOf(msg.user_id);

            /*
            if (inviteIdx > -1) {
                // no op
            } else {
                client.emit('error', {'error': 'Not invited to the party.'});
                return;
            }
            */

            request.post(
                approot + '/get_token',
                {form : { session_id : msg.session_id }},
                function(error, response, body) {

                    console.log(body);

                    if (!error && response.statusCode == 200) {
                        res = JSON.parse(body);

                        client.set('user_id', msg.user_id);

                        if (call_state.members.indexOf(msg.user_id) == -1) {
                            call_state.members.push(msg.user_id);
                        }

                        // join the room
                        client.join(msg.session_id);


                        if (msg.teletalk) {
                            // let everyone know there's a new guy in town.
                            io.sockets.in(msg.session_id).emit('notify', {
                                'msg' : msg.user_id + ' joined the chat.'
                            });

                            // send user backlog of messages
                            client.emit('message', {
                                'messages': call_state.buffer
                            });

                            // report token to user
                            client.emit('join', {
                                'token': res.token,
                                'session_id': msg.session_id
                            });

                        } else {
                            client.emit('join-global', {
                                'token': res.token,
                                'session_id': msg.session_id
                            });
                        }


                    }
                }
            );

            return;
        }
        client.emit('error', {'error': 'Something is wrong!'});

    });

    client.on('invite', function(msg) {
        var call_state = calls[msg.session_id];

        if (call_state) {
            if (call_state.members.indexOf(msg.inviter) > -1 && (call_state.invited.indexOf(msg.invitee) == -1 || true)) {
                call_state.invited.push(msg.invitee);
                for (var i in clients) {
                    clients[i].get('user_id', function(err, user_id) {
                        if (user_id == msg.invitee) {
                            console.log(user_id);
                            clients[i].emit('invited', msg);
                        }
                    });
                }
            }

            return;
        }
        client.emit('error', {'error': 'Something is wrong!'});
    });

    client.on('lead', function(msg) {
        io.sockets.in(msg.session_id).emit('follow', msg);
    });

    client.on('chatmsg', function(msg){

        var call_state = calls[msg.session_id],
            message = {};

        if (call_state) {
            call_state.buffer.push(msg);
            if (call_state.buffer.length > 100) {
                // clean up buffer
            }
            console.log(calls);
            io.sockets.in(msg.session_id).emit('message', { 'messages': [msg] });
            return;
        }
        client.emit('error', {'error': 'Something is wrong!'});
    });

    client.on('disconnect', function(){
        clients.splice(clients.indexOf(client), 1);
        var rooms = io.sockets.manager.roomClients[client.id];
        for (var field in rooms) {
            if (field.length > 0) {
                var session_id = field.substring(1);
                if (session_id in calls) {
                    client.get('user_id', function(err, uid) {
                        io.sockets.in(session_id).emit('notify', {
                            'msg' : uid + ' has left chat.'
                        });
                    });
                }
            }
        }
    });

    client.on('login', function(){

    });

    client.on('send_notification', function(){

    });

});