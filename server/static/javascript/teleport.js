
// REALTIME NOTIFICATION SOCKET
var socket = io.connect('http://anantb.csail.mit.edu:3000/');

// Global Tables




/*
==================================
 COntacts/Feed
==================================
*/

function get_contact_html(id){
	var raw_html = '<tr class="clickable">'
	raw_html += '<td class="metadeta"><span class="profile-small"></span></td>'
	raw_html += '<td class="content"><span class="online"></span><a href="/teletalk">Anant Bhardwaj</a></td>'
	raw_html += '</tr>'

	return raw_html
}





function get_feed_html(id){
	var raw_html = '<tr class="clickable">'
	raw_html += '<td class="metadeta"><span class="profile-small"></span></td>'
	raw_html += '<td class="content">'
	raw_html += '<ul>'
	raw_html += '<li class="from">Anant Bhardwaj</li>'
	raw_html += '<li class="blurb">Our study suggests that a careful combination of methods that increase social transparency and different peer-dependent reward schemes can significantly improve crowdsourcing outcomes.</li>'

	raw_html += '</ul>'
	raw_html += '</td>'
	raw_html += '</tr>'

	return raw_html
}






/*
==================================
 Teleport related stuff
==================================
*/

var ge = null;
var cam = null;

function initTeleport() {
	google.load("maps", "2", {"callback" : loadGoogleEarth});	
}

function loadGoogleEarth(){
	google.load("earth", "1", {"callback" : initGoogleEarth});
}


function initGoogleEarth() {
 	google.earth.createInstance("map3d", geInitSuccess, geInitFail);
}


function geInitSuccess(object) {
	ge = object;
	ge.getOptions().setFlyToSpeed(100);
	//ge.getLayerRoot().enableLayerById(ge.LAYER_ROADS, true);
	ge.getLayerRoot().enableLayerById(ge.LAYER_BUILDINGS, true);
	// ge.getLayerRoot().enableLayerById(ge.LAYER_TERRAIN, true);
	//ge.getLayerRoot().enableLayerById(ge.LAYER_TREES, true);

	setLocation('MIT', "Massachusetts Institute of Technology")

	keyboardFocusHack(ge);
}

function geInitFail(object) {
  alert("Failed to initialize Google Earth! Teleport functionality might not work properly.")
}




function createPlacemark(point, geocodeLocation, desc){
    // create the placemark
    placemark = ge.createPlacemark('');

    var p = ge.createPoint('');
    p.setLatitude(point.y);
    p.setLongitude(point.x);
    placemark.setGeometry(p);

    // add the placemark to the earth DOM
    ge.getFeatures().appendChild(placemark);   
    placemark.setName(geocodeLocation);
    placemark.setDescription(desc);  

}


function setLocation(geocodeLocation, desc){
	var geocoder = new google.maps.ClientGeocoder();
	geocoder.getLatLng(geocodeLocation, function(point) {
	if(point) {
	    cam = new FirstPersonCam([point.y, point.x, 0])
	    cam.refreshCamera();
	    ge.getWindow().setVisibility(true); 
	    createPlacemark(point, geocodeLocation,  desc)
	  }
	});
  
}


/*
==================================
 Teletalk related stuff
==================================
*/


var apiKey = null
var userId = null
var sessionId, _session_id, token, session, invited;

var socket = null
        
  

function initTeletalk(apiKey, userId){
	apiKey = apiKey
	userId = userId
	if ($.getUrlVar('session')) {
		_session_id = $.getUrlVar('session');
		invited = true;
	}
	if(socket == null){
		socket = io.connect('http://anantb.csail.mit.edu:3000/');
	}
	bindTeletalkEvents()

}
    
    
function bindTeletalkEvents(){  

    socket.on('notify', function(data) {
        if (data) {
            $('#messages').prepend('<p>'+ data.msg +'</p>');
        }
    });

    socket.on('join', function (data) {
        token = data.token;
        sessionId = data.session_id;

        //TB.setLogLevel(TB.DEBUG);
        // Initialize session, set up event listeners, and connect
        session = TB.initSession(sessionId);
        session.addEventListener('sessionConnected', sessionConnectedHandler);
        session.addEventListener('streamCreated', streamCreatedHandler);
        session.connect(apiKey, token);
    });

    socket.on('message', function (data) {
        var messages = data.messages;
        for(var i in messages) {
            $('#messages').prepend('<p>['+messages[i].user_id +'] '+messages[i].message+'</p>');
        }
    });

    socket.on('leave', function (data) {
        $('body').append('</br>'+data);
    });

    socket.on('accepted', function (data) {
        socket.emit('join', {
            'user_id' : userId,
            'session_id': data.session_id
        });
    });

    socket.on('follow', function (data) {
        // update google earth with leader's coordinates
    });

    socket.on('error', function (data) {
        alert(data.error);
    });
}

function resize(elemId, height) {
    var oldWidth, oldHeight, ratio, elem;
    elem = $("#" + elemId)

    oldWidth = elem.width();
    oldHeight = elem.height();
    ratio = parseFloat(oldWidth)/parseFloat(oldHeight);

    elem.height(height);
    elem.width(height * ratio);
}


// OpenTok stuff.
function sessionConnectedHandler(event) {
    var elemId = 'my-chat-window';

    var publisher = TB.initPublisher(apiKey, elemId);
    session.publish(publisher);

    resize(elemId, 115);

    // Subscribe to streams that were in the session when we connected
    subscribeToStreams(event.streams);
}

function streamCreatedHandler(event) {
    // Subscribe to any new streams that are created
    subscribeToStreams(event.streams);
}

function subscribeToStreams(streams) {
    for (var i = 0; i < streams.length; i++) {
    // Make sure we don't subscribe to ourself
        if (streams[i].connection.connectionId == session.connection.connectionId) {
          return;
        }

        // Create the div to put the subscriber element in to
        var div = $('<div></div>');
        div.appendTo($('#chat-windows'))
        div.attr('id', 'stream' + streams[i].streamId);
        //document.body.appendChild(div);
        // Subscribe to the stream
        session.subscribe(streams[i], div.attr('id'));
    }
}


function joinChat(sessionId) {
    socket.emit('join', {
        user_id: userId,
        session_id: sessionId
    })
}

function initiateChat() {
    socket.emit('initiate', {'initiator': userId});
}

function sendMessage(message) {
    if (sessionId) {
        var msg = {
            'message': message,
            'session_id': sessionId,
            'user_id': userId
        };
        if(msg.message) {
            socket.emit('chatmsg', msg);
            $('#field').val('');
        }
    }
}

function inviteUser(invitee) {
    if (sessionId) {
        var msg = {
            'invitee': invitee,
            'session_id': sessionId,
            'inviter': userId
        };
        if(msg.invitee) {
            baseurl = window.location.href.split('?')[0];
            socket.emit('invite', msg);
            $('#messages').prepend("<br/>"+baseurl+"?session="+sessionId);
            $('#invitee').val('');
        }
    }
}



/*
==================================
 	Utility Functions
==================================
*/

//This script extracts parameters from the URL
$.extend({
    getUrlVars : function() {
        var vars = [], hash;
        var hashes = window.location.href.slice(
                window.location.href.indexOf('?') + 1).split('&');
        for ( var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    },
    getUrlVar : function(name) {
        return $.getUrlVars()[name];
    }
});

