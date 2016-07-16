var moment = require('../moment/moment');
moment.locale('fr');

var freesms = module.exports = function (opts) {
	
	if (!(this instanceof freesms)) {
		return new freesms(opts);
	}
	
	opts = opts || {};
	
	this.Sarah = this.Sarah || opts.Sarah;
	this.config = this.config || opts.config;
	this.logger = this.logger || opts.logger;
	
	this.send = function (eventsList,callback) {this.startBody("Tobe", eventsList, function { 
								callback();
						   })};
	this.sendLostEvents = function (eventsList) {this.startBody("Lost", eventsList)};
	
}


freesms.prototype.startBody = function (type, eventsList, callback) {

	var client = this;
	
	if (typeof eventsList === 'string')
		client.sendNotif(type,eventsList,client,callback);
	else
		setBody(type,eventsList, 0, '', true, client, setBody,callback);

}



var setBody = function (type,eventsList, pos, body, init, client, callback, callbackNext) {
	
	if (pos == eventsList.length) {
		client.sendNotif(type,body,client,callbackNext);
		return;
	}
	
	var currentDate = moment().format("YYYY-MM-DD"),
		eventDate= moment(eventsList[pos][1]).format("YYYY-MM-DD"),
		diffDay = moment(eventDate).diff(currentDate,"days");
	
	switch (diffDay) {
		case 0: // aujourd'hui
				if (init == true)
					body += 'Aujourd\'hui:\n';
				init = 'today';
				break;
		case 1: // demain
				if (init == 'today')
					body += '\n';
				if (init != 'tomorrow') 
					body += 'Demain:\n';
				init = 'tomorrow';
				break;
		case 2: // après demain
				if (init == 'tomorrow' || init == 'today')
					body += '\n';
				if (init != 'afterTomorrow') 
					body += 'Après demain:\n';
				init = 'afterTomorrow';
				break;
		default: // Direct le nombre de jours
				if (init == "afterTomorrow" || init == 'tomorrow' || init == 'today' || init.toString() != diffDay.toString()) 
					body += '\nDans '+diffDay+' jours:\n';
				init = diffDay;
				break;
	}
	
	if (eventsList[pos][0].Hour == 'repeat')
		body += "  "+eventsList[pos][0].Event+"\n";
	else
		body += "  "+eventsList[pos][0].Hour + ": " + eventsList[pos][0].Event+"\n";
	
	callback (type,eventsList, ++pos, body, init, client, callback, callbackNext);
	
}



freesms.prototype.sendNotif = function (type,txt, client, callback) {
	
	var client = this;
	
	var body = (type == "Tobe") ? "Evénements à venir\n" : "Evénements manqués\n";
	body += 'De Sarah le ' + moment().format("DD/MM/YYYY - HH:mm"); 
	body += "\n\n" + txt + "\n";
	
	var token = client.config.notification.SMStoken,
		user = client.config.notification.SMSuser;

	var url = 'https://smsapi.free-mobile.fr/sendmsg';
	url += '?user=' + user;
	url += '&pass=' + token;
	url += '&msg='+body;
	process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
	
	var request = require('request');
	request({ 'uri': url }, function (err, response, body){
		if (err || response.statusCode != 200)
			client.logger.error('Free SMS error: %s', err);
		else
			client.logger.info("SMS Envoyé");
		
		if (callback) callback();
	}); 
}