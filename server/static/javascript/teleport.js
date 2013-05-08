
var nodeSrv='http://teleport.csail.mit.edu:3000/';

// REALTIME NOTIFICATION SOCKET
var socket = io.connect(nodeSrv);

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
var loc = null

function initTeleport(_loc) {
	loc = _loc
	console.log(loc)
	google.load("maps", "2", {"callback" : loadGoogleEarth});
}

function loadGoogleEarth(){
	google.load("earth", "1", {"callback" : initGoogleEarth});
}


function initGoogleEarth() {
 	google.earth.createInstance("map3d", geInitSuccess, geInitFail);
}

function get_hash() {
    if(window.location.href.indexOf('#') != -1)
        return decodeURIComponent(window.location.href.slice(window.location.href.indexOf('#') + 1))
    else
        return null
}

function geInitSuccess(object) {
	ge = object;
	ge.getOptions().setFlyToSpeed(100);
	//ge.getLayerRoot().enableLayerById(ge.LAYER_ROADS, true);
	ge.getLayerRoot().enableLayerById(ge.LAYER_BUILDINGS, true);
	// ge.getLayerRoot().enableLayerById(ge.LAYER_TERRAIN, true);
	//ge.getLayerRoot().enableLayerById(ge.LAYER_TREES, true);
	if(loc != null && loc!=""){
		console.log(loc)
		setLocation(loc)
		createPlacemark(loc)
	}else{
		setLocation('MIT Cambridge', "Massachusetts Institute of Technology")
	}

	keyboardFocusHack(ge);
}

function geInitFail(object) {
  alert("Failed to initialize Google Earth! Teleport functionality might not work properly.")
}



function add_feed(location){
	var url = "http://teleport.csail.mit.edu/teleport#" +encodeURIComponent(location);
    var msg = "Looking forward to seeing \"" + location  + "\". <a href=\""+url+"\">"+url+"</a>"
	$.ajax({
      type: 'POST',
      async: true,
      url: '/add_feed/',
      data: {'msg':msg},
      success: function(res) {
          show_notify('Shared with your contacts', true)
      }
  });
}

function send_tweet(location){
	var url = "http://teleport.csail.mit.edu/teleport#" +encodeURIComponent(location);
    var message = "Looking forward to seeing \"" + location  + "\""
    window.open ("https://twitter.com/share?" +
    	"url=" + encodeURIComponent(url) +
        "&counturl=" + encodeURIComponent(url) +
        "&text=" + encodeURIComponent(message) +
        "&hashtags=" + encodeURIComponent('teleport') +
        "&via=" + encodeURIComponent('teleport_mit'),
        "twitter", "width=500,height=300");
}

function show_notify(msg, res){
	if(!res){
		noty({text: msg, dismissQueue: true, timeout:2000, force: true, type: 'error', layout: 'topCenter'});
	}else{
		noty({text: msg, dismissQueue: true, timeout:2000, force: true, type:'success', layout: 'topCenter'});
	}
}


function show_notify_stick(msg, res){
	if(!res){
		noty({text: msg, dismissQueue: false,  force: true, type: 'error', layout: 'topCenter'});
	}else{
		noty({text: msg, dismissQueue: false, force: true, type:'success', layout: 'topCenter'});
	}
}

function createPlacemark(geocodeLocation){
	var geocoder = new google.maps.ClientGeocoder();
	geocoder.getLatLng(geocodeLocation, function(point) {
	if(point) {
	    // create the placemark
	    placemark = ge.createPlacemark('');

	    var p = ge.createPoint('');
	    p.setLatitude(point.y);
	    p.setLongitude(point.x);
	    placemark.setGeometry(p);

	    var balloon = ge.createHtmlDivBalloon('');
		balloon.setFeature(placemark);
		var div = document.createElement('DIV');
		div.innerHTML = geocodeLocation + '<br /><a href="#" onclick="add_feed(\''+geocodeLocation+'\');">Post</a> &nbsp; &nbsp; <a href="#" onclick="send_tweet(\''+geocodeLocation+'\');">Tweet</a> &nbsp; &nbsp; <a href="#" onclick="addURL();">Add Image/Video</a>';
		balloon.setContentDiv(div);
		ge.setBalloon(balloon);
	    // add the placemark to the earth DOM
	    ge.getFeatures().appendChild(placemark);
	    placemark.setName(geocodeLocation);
	    //placemark.setDescription(desc);
	}else{
	  	alert("Couldn't find the location");
	 }
	});


}


function setLocation(geocodeLocation){
	var geocoder = new google.maps.ClientGeocoder();
	geocoder.getLatLng(geocodeLocation, function(point) {
	if(point) {
	    cam = new FirstPersonCam([point.y, point.x, 0])
	    cam.refreshCamera();
	    ge.getWindow().setVisibility(true);
	    if(socket == null){
	    	socket = io.connect(nodeSrv);
	    }
	    socket.emit('follow', {'location': geocodeLocation});
	    return point
	  }else{
	  	alert("Couldn't find the location");
	  }
	});

}


/*
==================================
  Global session management stuff
==================================
*/

function displaySessions(data) {
    var session_cont = $(".session-info");
    //session_cont.empty();
    if(data.length >0){
        console.log("display", data);
        var s = data[0];
        var url = "/teletalk?session="+s.session_id;
        localStorage.setItem("sessionId",s.session_id);
        joinChat(s.session_id, false);
        $("#other-chat-window").click(function() {
            window.location = url;
        });
        session_cont.prepend("<a class='nav' href='/teletalk?session="+s.session_id+"'>Current Chat</a>");
    }

}

function bindGlobalEvents() {
    socket.on('sessionUpdate', function(data) {
        displaySessions(data);
    });

    socket.on('join-global', function(data) {
        console.log('join-global', data);
        initSmallVideo(data.session_id, data.token);
    });

    socket.on('invited', function(data) {
        console.log(data);
        show_notify_stick('Yay', true);
    })
}

function getLiveSessions(userId) {
    socket.emit('getLiveSessions', {
        user_id: localStorage.getItem('userId')
    });
}


/*
==================================
 Teletalk related stuff
==================================
*/

//var userId = null
var sessionId, _session_id, _invitee, token, session, invited;


function initTeletalk(apiKey, userId){
	apiKey = apiKey
	userId = userId
	if ($.getUrlVar('session')) {
		_session_id = $.getUrlVar('session');
		invited = true;
	} else if ($.getUrlVar('invite')) {
        _invitee = $.getUrlVar('invitee');
    }
	if(socket == null){
		socket = io.connect(nodeSrv);
	}
	bindTeletalkEvents()

}

function initSmallVideo(sessionId, token) {
    //TB.setLogLevel(TB.DEBUG);
    session = TB.initSession(sessionId);
    session.addEventListener('sessionConnected', svSessionConnectedHandler);
    session.addEventListener('streamCreated', svStreamCreatedHandler);
    session.connect(apiKey, token);
}

function svSessionConnectedHandler(event) {
    if (window.location.pathname == '/teleport') {
        var elemId = 'my-chat-window';
        var publisher = TB.initPublisher(apiKey, elemId);
        session.publish(publisher);
        resize(elemId, 100);
    }
    svSubscribeToStreams(event.streams);
}

function svStreamCreatedHandler(event) {
    svSubscribeToStreams(event.streams);
}

function svSubscribeToStreams(streams) {
    for (var i = 0; i < streams.length; i++) {
    // Make sure we don't subscribe to ourself
        if (streams[i].connection.connectionId == session.connection.connectionId) {
          return;
        }
        session.subscribe(streams[i], 'other-chat-window');
        resize('other-chat-window', 100);
    }
}

function bindTeletalkEvents(){

    socket.on('notify', function(data) {
        alert_msg(data.msg);
    });

    socket.on('join', function (data) {
        token = data.token;
        sessionId = data.session_id;
        // Initialize session, set up event listeners, and connect
        //TB.setLogLevel(TB.DEBUG);
        session = TB.initSession(sessionId);
        session.addEventListener('sessionConnected', sessionConnectedHandler);
        session.addEventListener('streamCreated', streamCreatedHandler);
        session.connect(apiKey, token);
    });

    socket.on('message', function (data) {
        var messages = data.messages;
        for(var i in messages) {
            $('#messages').append('<p>['+messages[i].user_id +'] '+messages[i].message+'</p>');
        }
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    });

    socket.on('leave', function (data) {
        $('body').append('</br>'+data);
    });

    socket.on('accepted', function (data) {
        joinChat(data.session_id, true);
        if (_invitee) {
            var msg = {
                'invitee': _invitee,
                'session_id': data.session_id,
                'inviter': userId
            };

            socket.emit('invite', msg);
        }
    });

    socket.on('follow', function (data) {
        // update google earth with leader's coordinates
        if(data.reset){
        	var la = ge.createLookAt('');
			  la.set(data.reset.localAnchorLla[0], data.reset.localAnchorLla[1],
			         cameraAltitude + bounce,
			         ge.ALTITUDE_RELATIVE_TO_SEA_FLOOR,
			         fixAngle(data.reset.headingAngle * 180 / Math.PI), /* heading */         
			         data.reset.tiltAngle * 180 / Math.PI + 90, /* tilt */         
			         0 /* altitude is constant */         
			         );  
			  ge.getView().setAbstractView(la);  
        }
        if(data.keyup != null){
        	keyUp(data.keyup)
        }
        if(data.keydown != null){
        	keyDown(data.keydown)
        }
        console.log('follow: ', data)
    });

    socket.on('error', function (data) {
        alert_msg(data.error);
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

    resize(elemId, 100);

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
        var div = $('<div style="width:100%;"></div>');
        div.appendTo($('#chat-windows'))
        div.attr('id', 'stream' + streams[i].streamId);
        //document.body.appendChild(div);
        // Subscribe to the stream
        session.subscribe(streams[i], div.attr('id'));
        //console.log($('#stream' + streams[i].streamId))
        $('#stream' + streams[i].streamId).css('width', '100%')
        resize('stream' + streams[i].streamId, 200);
    }
}

function joinChat(sessionId, teletalk) {
    socket.emit('join', {
        user_id: userId,
        session_id: sessionId,
        teletalk: teletalk
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

        baseurl = window.location.href.split('?')[0];
        socket.emit('invite', msg);
        $('#messages').append('Notification sent! You can also directly send this URL to people: <br/>'+'<a href="' + baseurl+'?session='+sessionId + '">'+baseurl+'?session='+sessionId+'</a>');
        $('#invitee').val('');
    }
}


function alert_msg(msg){
    var sel = '#alert';
    $(sel).show();
    $(sel).text(msg);
    setTimeout(function() {
        $(sel).fadeOut(1000);
    }, 3000);
}

function enable_alert(msg){
  $("body .alert .message").text(msg);
  $("body").addClass("notice");
  setTimeout(function(){
    $("body").removeClass("notice");
  }, 3000);
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




