var moment = require('../moment/moment');
moment.locale('fr');

var pushover = module.exports = function (opts) {
	
	if (!(this instanceof pushover)) {
		return new pushover(opts);
	}
	
	opts = opts || {};
	
	this.Sarah = this.Sarah || opts.Sarah;
	this.config = this.config || opts.config;
	this.logger = this.logger || opts.logger;
	
	this.send = function (eventsList,callback) {this.startBody("Tobe", eventsList, function() { 
								callback();
						   })};
	this.sendLostEvents = function (eventsList) {this.startBody("Lost", eventsList)};
	
}


pushover.prototype.startBody = function (type, eventsList, callback) {

	var client = this;
	
	if (typeof eventsList === 'string')
		client.sendNotif(type,eventsList,client,callback);
	else
		setBody(type, eventsList, 0, '', true, client, setBody,callback);

}


var setBody = function (type, eventsList, pos, body, init, client, callback, callbackNext) {
	
	if (pos == eventsList.length) {
		body += '</ul>';
		client.sendNotif(type,body,client,callbackNext);
		return;
	}
	
	var currentDate = moment().format("YYYY-MM-DD"),
		eventDate= moment(eventsList[pos][1]).format("YYYY-MM-DD"),
		diffDay = moment(eventDate).diff(currentDate,"days");
	
	switch (diffDay) {
		case 0: // aujourd'hui
				if (init == true)
					body += '<u><b>Aujourd\'hui:</b></u><br><ul>';
				init = 'today';
				break;
		case 1: // demain
				if (init == 'today')
					body += '</ul>';
				if (init != 'tomorrow') 
					body += '</ul><u><b>Demain:</b></u><br><ul>';
				init = 'tomorrow';
				break;
		case 2: // après demain
				if (init == 'tomorrow' || init == 'today')
					body += '</ul>';
				if (init != 'afterTomorrow') 
					body += '<u><b>Après demain:</b></u><br><ul>';
				init = 'afterTomorrow';
				break;
		default: // Direct le nombre de jours
				if (init == "afterTomorrow" || init == 'tomorrow' || init == 'today' || init.toString() != diffDay.toString()) 
					body += '</ul><u><b>Dans '+diffDay+' jours:</b></u><br><ul>';
				
				init = diffDay;
				break;
	}
	
	if (eventsList[pos][0].Hour == 'repeat')
		body += "<li>"+eventsList[pos][0].Event+"</li>";
	else
		body += "<li>à "+eventsList[pos][0].Hour + ": " + eventsList[pos][0].Event+"</li>";
	
	callback (type, eventsList, ++pos, body, init, client, callback, callbackNext);
	
}


pushover.prototype.sendNotif = function (type, body, client, callback) {
	
	var title = (type == "Tobe") ? "Evénements à venir" : "Evénements manqués";
	
	body = '<font color="purple">'+body+"</font><br>";
	var msg = {
		message: body,
		sound: 'magic',
		title: title,
		html: 1,
	};
	
	var token = client.config.notification.pushoverToken,
		user = client.config.notification.pushoverUser;

	var push = require('../pushover');
    var p = new push({
		user: user,
		token: token,
		update_sounds: true,
		debug: true
	});

	p.send(msg, function( err, result ) {
		if (err && result != 200)
			client.logger.error('Push error: %s', err);
		else 
			client.logger.info('Notification envoyée');
		
		if (callback) callback();
	}); 
}


