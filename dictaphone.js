/*
	Author: Stéphane Bascher
	Date: 04-07-2016
	Version: 1.0: First version.
*/


// Global variables
var Sarah
	, SarahClient
	, logger
	, _config
	, soxkilled = false
	, cron
	, filememo
	, CalendarOrMemo
	, rubric
	, posplay
	, playInfos = {list: [], rubric: "", date: "", pos: 0}
	, fs = require('./lib/fs-extra')
	, moment = require('./lib/moment/moment')
	, request = require('request')
	, _ = require('./lib/underscore')
	, cronJob = require('cron').CronJob
	, recsound = require('./lib/recorder/index.js');
	 
moment.locale('fr');	
	
// Init Sarah	 
exports.init = function(_SARAH){
	
	var winston = require('./lib/winston');
	logger = new (winston.Logger)({
		transports: [
			new (winston.transports.Console)()
		]
	});
	
	getVersion(_SARAH, function () { 
		initDictaphone();
	});
	
}



// Init dictaphone	
var initDictaphone = function(callback) {
	
	_config = {
		lang: getConfig().modules.dictaphone.sox.language || 'fr-FR',
		soxpath: getConfig().modules.dictaphone.sox.path || '',
		soxparam:  getConfig().modules.dictaphone.sox.params || '',
		timerecord: getConfig().modules.dictaphone.sox.timeRecord  || 60,
		threshold: getConfig().modules.dictaphone.sox.threashold  || 0.8,
		googleapi : getConfig().modules.dictaphone.sox.google_api || '',
		verbose: getConfig().modules.dictaphone.verbose || false,
		rappelMemo: getConfig().modules.dictaphone.Memo.setRappel || true,
		categoryMemo: getConfig().modules.dictaphone.Memo.setCategory || true,
		defaultCategoryMemo: getConfig().modules.dictaphone.Memo.defaultCategory || "divers",
		defaultCategoryEvent: getConfig().modules.dictaphone.Event.defaultCategory || "divers",
		sendType: getConfig().modules.dictaphone.notification.sendType || '',
	};	
	
	// callback if required
	if (callback) callback();
}


// Sarah actions
exports.action = function(data, callback, config, SARAH){
	
	// ? Are you nuts ? leave back home.
	if (data.command === undefined)
		return callback({});
	
	if (_config.verbose == true) logger.info('debug actif');
	
	// table of actions
	var tblActions = {
		recordEvent: function() {rubric = (data.rubric) ? data.rubric : _config.defaultCategoryEvent; 
									Sarah.obj.speak("Je t'écoute pour un " + rubric + "...", function() { 
										startRecordEvent(manageEvent);
									});
									},
		setTime: function() {setTime(data.start)},
		recordMemo: function() { Sarah.obj.speak("Je t'écoute pour un mémo...", function() { 
									startRecordMemo(manageMemo)
								})
								},
		setRubric: function() { setRubric(data.rubric)},
		findEvent: function() { var sendType = (data.sendType) ? data.sendType : "SpeechOnly";
								if (sendType != 'Trigger' && sendType != 'Trigger-Push')
									findEvent((data.genre) ? data.genre : 'M',(data.rubric) ? data.rubric : 'all', ((data.date) ? data.date : "=0"), (data.lostEvents && data.lostEvents == 'true') ? true : false, sendType);
								else
									findEvent((data.genre) ? data.genre : 'M',(data.rubric) ? data.rubric : 'all', ((data.date) ? data.date : "=0"), false, sendType, callback);
							},	
		findMemo: function() { findMemo((data.rubric) ? data.rubric : 'all', (data.date) ? data.date : "=0")},
		nextplay: function() { nextPlay()},
		stopplay: function() { stopPlay()},
		delplay: function() { delPlay()}
	};
	
	if (_config.verbose == true) logger.info("data.command: %s", data.command);
	
	tblActions[data.command]();
	
	// return fucking callback
	if (!data.sendType || (data.sendType && data.sendType != 'Trigger') && data.sendType != 'Trigger-Push')
		callback({});
}


var getVersion = function (_SARAH, callback) {
	if (typeof Config === "undefined" ) {
		logger.info("Dictaphone - Sarah version 3");
		Sarah = {version: 3, obj: _SARAH};
	} else  {
		logger.info("Dictaphone - Sarah version 4");
		Sarah = {version: 4, obj: SARAH};
	}
	callback ();
}


var getConfig = function(value){
  
	var conf = (Sarah.version == 4) ? Config : Sarah.obj.ConfigManager.getConfig();
	if (value)
		 conf = conf[value];
	return conf;
}


var exists = function(cmd){

  if (getConfig().modules[cmd])
    return true;

  return false;
}


var setTime = function (time) {
	
	if (_config.verbose) logger.info("Defined at: %s", time);
	
	var tblTime = {weekday: "", day: "", month: "", year: "", hour: time.split('-')[4]};
	
	if ((time.split('-')[0].toLowerCase() == 'today' && time.split('-')[1].toLowerCase() == 'current') || 
		time.split('-')[0].toLowerCase() == 'tomorrow' || 
		time.split('-')[0].toLowerCase() == 'aftertomorrow' ||
		time.split('-')[0].toLowerCase() == 'oneweekmore' ||
		time.split('-')[0].toLowerCase() == 'twoweekmore') {
		// Aujourd'hui, demain, après demain, dans une semaine, dans 2 semaines
		tblTime.weekday = setDayOfWeek(time.split('-')[0].toLowerCase());
		tblTime.day = setDayOfMonth(time.split('-')[0].toLowerCase());
		if (time.split('-')[2].toLowerCase() == 'all')
			tblTime.month = time.split('-')[2];
		else
			tblTime.month = setMonth(time.split('-')[0].toLowerCase());
		
		/* if (time.split('-')[2].toLowerCase() == 'current')
			tblTime.month = setMonth(time.split('-')[0].toLowerCase());
		else {
			if (time.split('-')[2].toLowerCase() == 'all')
				tblTime.month = time.split('-')[2];
			else {
				var month = (time.split('-')[2].length == 1) ? '0' + time.split('-')[2] : time.split('-')[2];
				tblTime.month =  moment('2016-'+month+'-01T14:00').format("MMMM");
			}
		}*/
		
		if (time.split('-')[3].toLowerCase() == 'current')
			tblTime.year = setYear(time.split('-')[0].toLowerCase());
		else
			tblTime.year = time.split('-')[3];
		
	} else if (time.split('-')[1].toLowerCase() == 'current' && 
				time.split('-')[0].toLowerCase() != 'today' &&
				time.split('-')[0].toLowerCase() != 'tomorrow' && 
				time.split('-')[0].toLowerCase() != 'aftertomorrow' &&
				time.split('-')[0].toLowerCase() != 'oneweekmore' &&
				time.split('-')[0].toLowerCase() != 'twoweekmore') {
			// Un jour de la semaine, lundi au dimanche
			var today = parseInt(moment().weekday()), // 0 = lundi - 6 = dimanche
				addDay;
			if (today >= parseInt(time.split('-')[0])) {
				var addDay = (7 - today) + parseInt(time.split('-')[0]);
			} else
				var addDay = today - parseInt(time.split('-')[0]);
			
			tblTime.weekday = setDayOfWeek(addDay);
			tblTime.day = setDayOfMonth(addDay);
			if (time.split('-')[2].toLowerCase() == 'current')
				tblTime.month = setMonth(addDay);
			else
				tblTime.month = time.split('-')[2];
			if (time.split('-')[3].toLowerCase() == 'current')
				tblTime.year = setYear(addDay);
			else
				tblTime.year = time.split('-')[3];
	} else if (time.split('-')[1].toLowerCase() != 'current') {
		// Si le jour est défini
	    if (time.split('-')[1].toLowerCase() != 'all' ) {
			var date = moment().format("YYYY-MM-DD"),
				hour = moment().format("HH:mm"),
				today = parseInt(moment().format("D")),
				daytime = (time.split('-')[1].length == 1) ? '0' + time.split('-')[1] : time.split('-')[1];
			
				// Si c'est pas tous les mois
				var month;
				if (time.split('-')[2].toLowerCase() == 'current' || time.split('-')[2].toLowerCase() == 'all')
					month = moment().format("MM");
				else 
					month = (time.split('-')[2].length == 1) ? '0' + time.split('-')[2] : time.split('-')[2];
					
				var year;
				if (time.split('-')[3].toLowerCase() == 'current') 
					year = moment().format("YYYY");
				else if (time.split('-')[3].toLowerCase() == 'all')
					year = (parseInt(moment().format("YYYY")) + 1).toString();
				else 
					year = time.split('-')[3];
					
				hourtime = (time.split('-')[4] == 'repeat' || time.split('-')[2] == 'all' ) ? hour : time.split('-')[4];
				
				if (moment(date+'T'+hour).isBefore(year+'-'+month+'-'+daytime+'T'+hourtime) == true ) {
					var nextday = moment(year+'-'+month+'-'+daytime+'T'+hour).format("YYYY-MM-DDTHH:mm"),
					    addDay = moment(nextday).diff(date+'T'+hour,"days");	
					
					tblTime.weekday = setDayOfWeek(addDay);
					tblTime.day = setDayOfMonth(addDay);
					
					if (time.split('-')[2].toLowerCase() == 'current')
						tblTime.month = setMonth(addDay);
					else {
						if (time.split('-')[2].toLowerCase() == 'all')
							tblTime.month = time.split('-')[2];
						else {
							var month = (time.split('-')[2].length == 1) ? '0' + time.split('-')[2] : time.split('-')[2];
							tblTime.month =  moment('2016-'+month+'-01T14:00').format("MMMM");
						}
					}
					
					if (time.split('-')[3].toLowerCase() == 'current')
						tblTime.year = setYear(addDay);
					else 
						tblTime.year = time.split('-')[3];
				} else {
					Sarah.obj.speak("Recommence, j'ai compris une date antérieure à la date d'aujourd'hui.");
					return;
				}	
			
		} else {
			// Tous les jours
			tblTime.weekday = 'All';
			tblTime.day = time.split('-')[1];
			if (time.split('-')[2].toLowerCase() == 'current')
				tblTime.month = setMonth(0);
			else {
				if (time.split('-')[2].toLowerCase() == 'all')
					tblTime.month = time.split('-')[2];
				else {
					var month = (time.split('-')[2].length == 1) ? '0' + time.split('-')[2] : time.split('-')[2];
					tblTime.month =  moment('2016-'+month+'-01T14:00').format("MMMM");
				}
			}
			if (time.split('-')[3].toLowerCase() == 'current')
				tblTime.year = setYear(0);
			else 
				tblTime.year = time.split('-')[3];
		}
	}
	
	if ( tblTime.weekday == "" || tblTime.day == "" || tblTime.month == "" || tblTime.year  == "" ) {
		Sarah.obj.speak("Recommence. Désolé, je n'étais pas concentré.");
		return;
	}
	
	if (_config.verbose) {
		logger.info("Day name: %s", tblTime.weekday); 
		logger.info("Day of month: %s", tblTime.day); 
		logger.info("Month: %s", tblTime.month); 
		logger.info("Year: %s", tblTime.year); 
		logger.info("Hour: %s", tblTime.hour); 
	}
	
	if (exists('mute') == true)
		Sarah.obj.call('mute', {command : 'autoMute', values : {Cmd: 'askme', Options: {timeout: false}}});
		
	askTime(tblTime);
	
}


var formatTTS = function (tblTime) {
	
	var tts;
	if (tblTime.day.toLowerCase() == 'all')
		tts = "Tous les jours,";
	else {
		if (tblTime.month.toLowerCase() != 'all') {
			if (tblTime.year.toLowerCase() != 'all')
				tts = "Pour le " + tblTime.weekday  + " " + tblTime.day;
			else
				tts = "Pour le " + tblTime.day;
		} else
			tts = "Pour le " + tblTime.day;
	}
	
	if (tblTime.month.toLowerCase() != 'all') {
		if ( tblTime.year.toLowerCase() == 'all' ) {
			if (tblTime.day.toLowerCase() != 'all')
				tts += " " + tblTime.month + ", tous les ans";
			else
				tts += " de " + tblTime.month + ", tous les ans";
		} else {
			if (tblTime.day.toLowerCase() != 'all')
				tts += " " + tblTime.month + " " + tblTime.year;
			else
				tts += " de " + tblTime.month + " " + tblTime.year;
		}
	} else {
		if (tblTime.year.toLowerCase() == 'all' )
			tts += " tous les mois, tous les ans";
		else
			tts += " tous les mois de " + tblTime.year;	
	}
	
	if (tblTime.hour.toLowerCase() != 'repeat' )
		tts += " à " + tblTime.hour;
	
	tts += " ?";
	
	return tts;
	
	
}



var askTime = function (tblTime) {
	
	var tts = formatTTS (tblTime);
	if (_config.verbose) logger.info("tts: %s", tts);
	
	nullGrammar();
	Sarah.obj.askme(tts, { 
				'qu\'est ce que je peux dire' : 'sommaire',
				'oui c\'est bon' : 'save',
				'oui parfait' : 'save',
				'non recommence' : 'again',
				'Annule': 'cancel'
		}, 0, function(answer, end){
			setTimeout(function(){
				switch (answer) {
				case 'sommaire':
					Sarah.obj.speak("oui c'est bon, oui parfait, non recommence ou annule.", function () {
						setTimeout(function(){
							askTime(tblTime);
						}, 1500);
					});
					end();
					break;
				case 'save':
					setTimeout(function(){
						saveRecord(tblTime);
					}, 1000);
					end();
					break;
				case 'again':	
					setTimeout(function(){
						Sarah.obj.speak("Je t'écoute...", function () {
							if (Sarah.version == 3)
								Sarah.obj.remote({'context' : 'lazydays.xml'});
							else
								Sarah.obj.remote({'context' : 'lazydays'});
						});
					}, 1000);
					end();
					break;
				case 'cancel':	
				default:
					Sarah.obj.speak("annulé.");
					if (filememo && CalendarOrMemo == 'Memo')
						fs.removeSync(__dirname + '\\record\\memo\\' + filememo + '.wav');
					
					rubric = null;
					CalendarOrMemo = null;
					filememo = null;
					end(true);
					break;
				}
			}, 500);
		});
}



var setRubric = function (rubrik) {
	
	if (!rubrik || rubrik == 'nothing') {
		if (!rubrik) 
			Sarah.obj.speak("recommence, je n'ai pas compris la rubrique.")
		return;
	}
	
	if (_config.verbose) logger.info("rubric: %s", rubrik); 
	
	nullGrammar();
	Sarah.obj.askme("Catégorie " + rubrik + " ?", { 
					'qu\'est ce que je peux dire' : 'sommaire',
					'oui c\'est bon,' : 'yes',
					'non recommence' : 'again',
					'annule': 'cancel'
			}, 0, function(answer, end){
				setTimeout(function(){
					switch (answer) {
					case 'sommaire':
						Sarah.obj.speak("oui c'est bon, non recommence ou annule.", function () {
							setTimeout(function(){
								setRubric(rubrik);
							}, 1500);
						});
						end();
						break;
					case 'yes':
						rubric = rubrik;
						if (_config.rappelMemo == true)
							setTimeout(function(){
								askMemoTime();
							}, 1000);
						else
							saveRecord();
						end();
						break;	
					case 'again':
						rubric = null;
						setTimeout(function(){
							Sarah.obj.speak("je t'écoute...", function () { 
								if (Sarah.version == 3)
									Sarah.obj.remote({'context' : 'lazyrubric.xml'});	
								else
									Sarah.obj.remote({'context' : 'lazyrubric'});	
							});
						}, 1000);
						end();
						break;
					case 'cancel':
					default:
						Sarah.obj.speak("annulé.", function () { 
							fs.removeSync(__dirname + '\\record\\memo\\' + filememo + '.wav');
							rubric = null;
							CalendarOrMemo = null;
							filememo = null;
						});
						end(true);
						break;
					}
				}, 500);
	});
	
}




var askMemoTime = function() {
	
	nullGrammar();
	Sarah.obj.askme("Tu veux définir un rappel ?", { 
					'qu\'est ce que je peux dire' : 'sommaire',
					'oui s\'il te plait' : 'yes',
					'non c\'est bon' : 'no',
					'non merci' : 'no',
					'annule': 'cancel'
			}, 0, function(answer, end){
				setTimeout(function(){
					switch (answer) {
					case 'sommaire':
						Sarah.obj.speak("oui s'il te plait, non c'est bon, non merci ou annule.", function () {
							setTimeout(function(){
								askMemoTime();
							}, 1500);
						});
						end();
						break;
					case 'yes':
						setTimeout(function(){
							Sarah.obj.speak("d'accord. Et pour quand tu veux ca ?", function() {
								if (Sarah.version == 3)
									Sarah.obj.remote({'context' : 'lazydays.xml'});	
								else
									Sarah.obj.remote({'context' : 'lazydays'});	
							});
						}, 1000);
						end();
						break;
					case 'no':
						Sarah.obj.speak("d'accord.", function () {
							saveRecord();
						});
						end();
						break;
					case 'cancel':
					default:
						Sarah.obj.speak("annulé.", function () { 
							fs.removeSync(__dirname + '\\record\\memo\\' + filememo + '.wav');
							rubric = null;
							CalendarOrMemo = null;
							filememo = null;
						});
						end(true);
						break;
					}
				}, 500);
			});
}






var findMemo = function (rubric, date, callback) {
	
	var db = require('./lib/dictaphonedb/dictaphonedb')({
			sarah: Sarah.obj,
			sarahConfig: (Sarah.version == 4) ? Config : null,
			_config: _config,
			verbose: _config.verbose});
			
	db.findEvent("Mémo", rubric, date, function(result) {
		
		if (_config.verbose) logger.info ("Mémo: %d", result[0].length);
		if (_config.verbose) logger.info ("Mémo perdus: %d", result[1].length);
		
		if (result[0].length > 0) {
			classMemos(result[0], rubric, date);
		} else {
			var tts;
			if (date.indexOf('=') != -1) 
				tts = "aucun mémo " + ((rubric == 'all') ? "" : rubric) + " aujourd'hui";
			else if (date.indexOf('<') != -1) 
				tts = "aucun mémo " + ((rubric == 'all') ? "" : rubric) + " pour les " + date.split('<')[1] + " prochains jours";
			else if (date == 'thisWeek')
				tts = "aucun mémo " + ((rubric == 'all') ? "" : rubric) + " cette semaine.";
			else if (date == 'nextWeek')
				tts = "aucun mémo " + ((rubric == 'all') ? "" : rubric) + " pour la semaine prochaine.";
			else if (date == 'thisMonth')
				tts = "aucun mémo " + ((rubric == 'all') ? "" : rubric) + " pour ce mois-ci";
			else {
				logger.error("Date incorrecte");
				backToGrammar();
				return ;
			}
			Sarah.obj.speak(tts);
			backToGrammar();
		}
	});
	
}


var classMemos = function (eventsList, rubric, date) {
	
	// Buble sort
	for (var i=0;i<eventsList.length;i++) {
		for (var a=0;a<eventsList.length;a++) {
			var tempdoc = [];
			if (moment(eventsList[a][1]).isAfter(moment(eventsList[i][1]))) {
				tempdoc = eventsList[i];
				eventsList[i] = eventsList[a];
				eventsList[a] = tempdoc;
			} 
		}
		if (i+1 == eventsList.length) {
			
			var tts = (rubric == 'all') 
				? "J'ai trouvé " + eventsList.length + " mémo" 
				: "J'ai trouvé " + eventsList.length + " mémo " + rubric;
			
			Sarah.obj.speak(tts, function() {
				setTimeout(function(){
					if (Sarah.version == 3)
						Sarah.obj.remote({'context' : 'lazyplay.xml'});	
					else
						Sarah.obj.remote({'context' : 'lazyplay'});	
					posplay = 0;
					speechMemos(eventsList, rubric, date, speechMemos);
				}, 1000);
			});
		}
	}
	
}




var findEvent = function (genre, rubric, date, lostEvents, sendType, callback) {
	
	if (_config.verbose) {
		logger.info ("send Type: %s",sendType);
		logger.info ("date: %s",date);
		logger.info ("rubric: %s",rubric); 
		logger.info ("lostEvents: %s",lostEvents); 
	} 
	
	var db = require('./lib/dictaphonedb/dictaphonedb')({
			sarah: Sarah.obj,
			sarahConfig: (Sarah.version == 4) ? Config : null,
			_config: _config,
			verbose: _config.verbose});
	
	db.findEvent("Event", rubric, date,function(result) {
		
		if (_config.verbose) logger.info ("Evénements à venir: %d", result[0].length);
		if (_config.verbose) logger.info ("Evénements perdus: %d", result[1].length);
		
		if (result[0].length > 0) {
			switch (sendType) {
				case 'Speech-Push' :
					classEventsToDo(sendType, result[0], rubric, date, lostEvents, result[1], pushEvents);
					break;
				case 'SpeechOnly' :
				case 'PushOnly' :
					classEventsToDo(sendType, result[0], rubric, date, lostEvents, result[1]);
					break;
				case 'Trigger' :
				case 'Trigger-Push' :	
					classEventsToDo(sendType, result[0], rubric, date, lostEvents, result[1], callback);
					break;
				default:
					Sarah.obj.speak("je suis désolé, le type d'envois n'est pas bon");
					backToGrammar();
			}
		} else {
			var tts;
			if (date.indexOf('=') != -1) {
				if (date.split('=')[1] == '0')
					tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " aujourd'hui";
				else if (date.split('=')[1] == '1')
					tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " pour demain";
				else if (date.split('=')[1] == '2')
					tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " pour après-demain";
				else 
					tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " dans " + date.split('=')[1] + " jours";
			} else if (date.indexOf('<') != -1) 	
				tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " pour les " + date.split('<')[1] + " prochains jours";
			else if (date == 'thisWeek')
				tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " cette semaine.";
			else if (date == 'nextWeek')
				tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " pour la semaine prochaine.";
			else if (date == 'thisMonth')
				tts = ((genre.toLowerCase() == 'm') ? "aucun " : "aucune ") + ((rubric == 'all') ? "evénements" : rubric) + " pour ce mois-ci";
			else {
				logger.error("Date incorrecte");
				backToGrammar();
				return ;
			}
			switch (sendType) {
				case 'Speech-Push' :
					Sarah.obj.speak("Il n'y a " + tts, function () { 
						pushEvents(sendType, tts,lostEvents, result[1], rubric, date);
					});
					backToGrammar();
					break;
				case 'SpeechOnly' :
					Sarah.obj.speak("Il n'y a " + tts);
					backToGrammar();
					break;
				case 'PushOnly' :
					pushEvents(sendType, tts,lostEvents, result[1], rubric, date);
				case 'Trigger' :
					callback ({tts: tts});
					break;
				case 'Trigger-Push' :
					pushEvents(sendType, tts,lostEvents, result[1], rubric, date);
					callback ({tts: tts});
					break;
				default:
					Sarah.obj.speak("je suis désolé, le type d'envois n'est pas bon");
					backToGrammar();
			}
		}
	});

}





var classEventsLost = function (notifyClass, eventsList, rubric, date) {
	
	if (eventsList.length > 0) {
		// Buble sort
		for (var i=0;i<eventsList.length;i++) {
			for (var a=0;a<eventsList.length;a++) {
				var tempdoc = [];
				if (moment(eventsList[a][1]).isAfter(moment(eventsList[i][1]))) {
					tempdoc = eventsList[i];
					eventsList[i] = eventsList[a];
					eventsList[a] = tempdoc;
				} 
			}
			if (i+1 == eventsList.length) {
				if (notifyClass == "Speech-Push" || notifyClass == "SpeechOnly"  )
					setTimeout(function(){
						Sarah.obj.speak("Il y a " + eventsList.length + " evénements que tu as loupé.",function() {
							setTimeout(function(){
								if (notifyClass == "Speech-Push")
									speechEventsLost(eventsList,0,speechEventsLost, rubric, date, pushEventsLost);
								else
									speechEventsLost(eventsList,0,speechEventsLost, rubric, date);
							}, 1000);
						});
					}, 500);
				else
					pushEventsLost(eventsList);
			}
		}
	} else
		backToGrammar();
	
}


var classEventsToDo = function (notifyClass, eventsList, rubric, date, lostEvents, lostEventsList, callback) {
	
	// Buble sort
	for (var i=0;i<eventsList.length;i++) {
		for (var a=0;a<eventsList.length;a++) {
			var tempdoc = [];
			if (moment(eventsList[a][1]).isAfter(moment(eventsList[i][1]))) {
				tempdoc = eventsList[i];
				eventsList[i] = eventsList[a];
				eventsList[a] = tempdoc;
			} 
		}
		if (i+1 == eventsList.length) {
			if (notifyClass == "Speech-Push" || notifyClass == "SpeechOnly")
				Sarah.obj.speak("J'ai trouvé " + eventsList.length + " " + ((rubric == 'all') ? 'evénements' : rubric),function() {
					setTimeout(function(){
						speechEvents(notifyClass, eventsList,0,speechEvents, rubric, date, lostEvents, lostEventsList, null, callback);
					}, 1000);
				});
			else if (notifyClass == "Trigger") 
				speechEvents(notifyClass, eventsList,0,speechEvents, rubric, date, lostEvents, lostEventsList, null, callback, eventsList.length + " " + ((rubric == 'all') ? 'evénements' : rubric));
			else if (notifyClass == "Trigger-Push") {
				speechEvents(notifyClass, eventsList,0,speechEvents, rubric, date, lostEvents, lostEventsList, null, callback, eventsList.length + " " + ((rubric == 'all') ? 'evénements' : rubric));
				pushEvents(notifyClass, eventsList, lostEvents, lostEventsList, rubric, date);
			} else
				pushEvents(notifyClass, eventsList, lostEvents, lostEventsList, rubric, date);
		}
	}
	
}


var pushEvents = function (notifyClass, eventsList, lostEvents, lostEventsList, rubric, date) {
	
	var notify = require('./lib/notify/' + _config.sendType)({
		config: getConfig().modules.dictaphone,
		Sarah: Sarah,
		logger: logger 
	});

	notify.send(eventsList, function() {  
		if (lostEvents == true)
			classEventsLost(notifyClass, lostEventsList, rubric, date);
	    else
			backToGrammar();
	}); 

}


var pushEventsLost = function (eventsList) {
	
	var notify = require('./lib/notify/' + _config.sendType)({
		config: getConfig().modules.dictaphone,
		Sarah: Sarah,
		logger: logger 
	});

	notify.sendLostEvents(eventsList); 

}



var speechEventsLost = function (eventsList, pos, callback, rubric, date, callbackNext) {
	
	if (pos == eventsList.length) {
		if (callbackNext) callbackNext(eventsList);
		backToGrammar();
		return;
	}
	
	var currentDate = moment().format("YYYY-MM-DD"),
		eventDate= moment(eventsList[pos][1]).format("YYYY-MM-DD"),
		diffDay = moment(eventDate).diff(currentDate,"days"),
		msg;
	
	switch (diffDay) {
		case 0: // aujourd'hui
				msg = "Aujourd'hui à " + eventsList[pos][0].Hour + ", tu avais " + eventsList[pos][0].Event;
				break;
		default: // Direct le nombre de jours
				if (eventsList[pos][0].Hour == 'repeat')
					msg = "il y a " + diffDay + " jours, tu avais " + eventsList[pos][0].Event;
				else
					msg = "il y a " + (diffDay * -1) + " jours à " + eventsList[pos][0].Hour + ", tu avais " + eventsList[pos][0].Event;
				break;
	}

	Sarah.obj.speak(msg, function() {
		setTimeout(function(){
			callback(eventsList, ++pos, callback, rubric, date, callbackNext);
		}, 1000);
	});
	
}


var stopPlay = function () {
	
	if (Sarah.version == 3)
		Sarah.obj.pause(filememo);
	else
		Sarah.obj.stop(filememo);
	posplay = 10100;
	
}


var nextPlay = function () {
	if (Sarah.version == 3)
		Sarah.obj.pause(filememo);
	else
		Sarah.obj.stop(filememo);
}


var delPlay = function(flag){
	
	if(!flag) {
		if (Sarah.version == 3) {
			Sarah.obj.pause(filememo);
		} else
			Sarah.obj.stop(filememo);
	}
	posplay = 10000;
	setTimeout(function(){
		nullGrammar();
		Sarah.obj.askme("tu veux vraiment le supprimer ?", { 
				'qu\'est ce que je peux dire' : 'sommaire',  
				'Oui s\'il te plait' : 'delete',
				'Oui c\'est bon' : 'delete',
				'non annule' : 'cancel',
				'annule' : 'cancel'
			}, 0, function(answer, end){
				setTimeout(function(){
					switch (answer) {
						case 'sommaire':
							Sarah.obj.speak("oui s'il te plait, oui c'est bon, non annule, ou annule.", function () {
								setTimeout(function(){
									delPlay(true);
								}, 1000);
							});
							end();
							break;
						case 'delete':
							if (exists('clientManager') == true) 
								Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/db/dictaphone.db']});
							
							var db = require('./lib/dictaphonedb/dictaphonedb')({
										sarah: Sarah.obj,
										sarahConfig: (Sarah.version == 4) ? Config : null,
										_config: _config,
										verbose: _config.verbose});
								
								db.removeMemo(filememo, function(result) { 
									var fullPathMemo = __dirname + "/record/memo/" + _.last(filememo.split('/'));
									fs.removeSync(fullPathMemo);
									Sarah.obj.speak("J'ai supprimé le mémo.", function () {
										if (Sarah.version == 3)
											Sarah.obj.remote({'context' : 'lazyplay.xml'});	
										else
											Sarah.obj.remote({'context' : 'lazyplay'});	
										setTimeout(function(){
											posplay = playInfos.pos + 1;
											speechMemos (playInfos.list, playInfos.rubric, playInfos.date, speechMemos);
										}, 1000);
									});		
								});	 
							end();
							break;
						case 'cancel':
						default:
							Sarah.obj.speak("d'accord, je reprend.", function () {
								if (Sarah.version == 3)
									Sarah.obj.remote({'context' : 'lazyplay.xml'});	
								else
									Sarah.obj.remote({'context' : 'lazyplay'});
								setTimeout(function(){
									posplay = playInfos.pos;
									speechMemos (playInfos.list, playInfos.rubric, playInfos.date, speechMemos);
								}, 1000);
							});
							end();
							break;
					}
				}, 500);
			});
	}, 1000);
	
}


var speechMemos = function (eventsList, rubric, date, callback){
	
	if (posplay >= eventsList.length) {
		if (posplay != 10000) { 
			backToGrammar();
			logger.info("Fin de lecture"); 
			setTimeout(function(){
				Sarah.obj.speak ("Fin des mémos");
			}, 1000);
		}
		return;
	}
	
	filememo = ((Sarah.version == 4) 
			? "../../../../plugins/dictaphone/record/memo/"
			: "plugins/dictaphone/record/memo/") + eventsList[posplay][0].File + ".wav";
	
	if (_config.verbose) logger.info("Fichier mémo: %s", filememo);
	
	var fullPathMemo = __dirname + "/record/memo/" + eventsList[posplay][0].File + ".wav";
	fs.exists(fullPathMemo, function (fileExists) {
		if (!fileExists) { 
			logger.info("Le fichier mémo %s n'existe pas", eventsList[posplay][0].File + ".wav"); 
			if (exists('clientManager') == true) 
				Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/db/dictaphone.db']});
			
			var db = require('./lib/dictaphonedb/dictaphonedb')({
						sarah: Sarah.obj,
						sarahConfig: (Sarah.version == 4) ? Config : null,
						_config: _config,
						verbose: _config.verbose});
						
			db.removeMemo(filememo, function(result) { 
				Sarah.obj.speak("Le fichier du mémo " + (posplay + 1) + " n'existe pas. J'ai supprimé l'entrée dans la base.", function () { 
					setTimeout(function(){
						++posplay;
						callback(eventsList, rubric, date, callback);
					}, 1000);
				});
			});
		} else {
			Sarah.obj.speak("mémo " + (posplay + 1) + "...", function() {
				setTimeout(function(){	
					if (posplay != 10000) { 
						playInfos.list = eventsList;
						playInfos.rubric = rubric;
						playInfos.date= date;
						playInfos.pos= posplay;
						++posplay;
					}
					Sarah.obj.play(filememo, function() {  
						setTimeout(function(){
							callback(eventsList, rubric, date, callback);
						}, 1000);
					});
				}, 2000);	
			});
		}
	});
	
}



var speechEvents = function (notifyClass, eventsList, pos, callback, rubric, date, lostEvents, lostEventsList, currentspeech, callbackNext, tts) {
	
	if (pos == eventsList.length) {
		if (callbackNext) {
			if (notifyClass != 'Trigger' && notifyClass != 'Trigger-Push')
				callbackNext(notifyClass, eventsList, lostEvents, lostEventsList, rubric, date);
			else
				callbackNext({tts: tts});
		} else if (lostEvents == true) {
			classEventsLost(notifyClass, lostEventsList, rubric, date);
		} else
			backToGrammar();
		return;
	}
	
	var currentDate = moment().format("YYYY-MM-DD"),
		eventDate= moment(eventsList[pos][1]).format("YYYY-MM-DD"),
		speechEventDate= (moment(eventsList[pos][1]).format("DD MMMM")).split(' '),
		diffDay = moment(eventDate).diff(currentDate,"days"),
		msg = " ";
	
	switch (diffDay) {
		case 0: // aujourd'hui
				if (currentspeech == null)
					msg += "aujourd'hui, ";
				if (eventsList[pos][0].Hour == 'repeat')
					msg += "il y a " + eventsList[pos][0].Event;
				else
					msg += "à " + eventsList[pos][0].Hour + ", il y a " + eventsList[pos][0].Event;
				currentspeech = "aujourd'hui";
				break;
		case 1: // demain
				if (currentspeech != "demain")
					msg += "demain, ";
		
				if (eventsList[pos][0].Hour == 'repeat')
					msg += "il y a " + eventsList[pos][0].Event;
				else
					msg += "à " + eventsList[pos][0].Hour + ", il y a " + eventsList[pos][0].Event;
				currentspeech = 'demain';
				break;
		case 2: // après demain
				if (currentspeech != "après demain")
					msg += "après demain, le " + speechEventDate[0] + " " + speechEventDate[1] + " ,";
		
				if (eventsList[pos][0].Hour == 'repeat')
					msg += "il y a " + eventsList[pos][0].Event;
				else
					msg += "à " + eventsList[pos][0].Hour + ", il y a " + eventsList[pos][0].Event;
				currentspeech = 'après demain';
				break;
		default: // Direct le nombre de jours
				if (eventsList[pos][0].Hour == 'repeat')
					msg += "Dans " + diffDay + " jours, le " + speechEventDate[0] + " " + speechEventDate[1] + " , il y a " + eventsList[pos][0].Event;
				else
					msg += "Dans " + diffDay + " jours, le " + speechEventDate[0] + " " + speechEventDate[1] + " à " + eventsList[pos][0].Hour + ", il y a " + eventsList[pos][0].Event;
				break;
	}
	
	if (notifyClass != 'Trigger' && notifyClass != 'Trigger-Push') {
		Sarah.obj.speak(msg, function() {
			setTimeout(function(){
				callback(notifyClass, eventsList, ++pos, callback, rubric, date, lostEvents, lostEventsList, currentspeech, callbackNext, tts);
			}, 1000);
		});
	} else {
		tts += '@@'+msg;
		callback(notifyClass, eventsList, ++pos, callback, rubric, date, lostEvents, lostEventsList, currentspeech, callbackNext, tts);
	}
		
}



var saveRecord = function (tblTime) {
	
	if (exists('clientManager') == true) 
			Sarah.obj.trigger('clientManager',{key:'unwatch', files: [__dirname + '/db/dictaphone.db']});
	
	var db = require('./lib/dictaphonedb/dictaphonedb')({
			sarah: Sarah.obj,
			sarahConfig: (Sarah.version == 4) ? Config : null,
			_config: _config,
			verbose: _config.verbose});
	
	db.saveEvent((CalendarOrMemo == 'Memo') ? "Mémo" : "Event",
				  rubric, 
				 (CalendarOrMemo != 'Memo') ? CalendarOrMemo : null,
				 (tblTime) ? tblTime : null,  
				 (filememo) ? filememo : null, 
				 function(result) { 
					if (CalendarOrMemo == 'Memo') {
						if (result == true)
							Sarah.obj.speak("Mémo sauvegardé");
						else
							Sarah.obj.speak("Je suis désolé, je n'ai pas pu sauvegarder le mémo");
					} else {
						if (result == true)
							Sarah.obj.speak(CalendarOrMemo + " dans la rubric " + rubric + " sauvegardé");
						else
							Sarah.obj.speak("Je suis désolé, je n'ai pas pu sauvegarder " + CalendarOrMemo);
					}	
					
					backToGrammar();
					
					rubric = null;
					CalendarOrMemo = null;
					filememo = null;		
					
	});	 
	
}

var backToGrammar = function () {
	
	Sarah.obj.remote({'context' : 'default'});
	if (exists('mute') == true)
		Sarah.obj.trigger('mute',{key:'lazyStop'});
	
}

var nullGrammar = function () {
	
	if (Sarah.version == 3)
		Sarah.obj.remote({'context' : 'lazynul.xml'});	
	else
		Sarah.obj.remote({'context' : 'lazynul'});
	
}



var manageMemo = function () { 

	if (_config.verbose) logger.info("Fichier mémo: %s", filememo);
	
	var filepath = __dirname + '\\record\\memo\\' + filememo + '.wav';
	fs.exists(filepath, function (fileExists) {
		if (!fileExists) { 
			logger.info("Le fichier mémo n'existe pas"); 
			Sarah.obj.speak("je ne suis pas arrivé à récupérer le mémo. Recommence.");
			filememo = null;
			backToGrammar();
			return;
		};
		
		CalendarOrMemo = 'Memo';
		if (_config.categoryMemo == true) {
			nullGrammar();
			Sarah.obj.askme("Tu veux définir une catégorie ?", { 
						'qu\'est ce que je peux dire' : 'sommaire',
						'oui s\'il te plait' : 'yes',
						'recommence' : 'again',
						'pas la peine' : 'no',
						'non merci' : 'no',
						'annule': 'cancel'
				}, 0, function(answer, end){
					setTimeout(function(){
						switch (answer) {
						case 'sommaire':
							Sarah.obj.speak("oui s'il te plait, pas la peine, recommence, non merci ou annule.", function () {
								setTimeout(function(){
									manageMemo();
								}, 1500);
							});
							end();
							break;
						case 'yes':
							setTimeout(function(){
								Sarah.obj.speak("je t'écoute...", function() {
									if (Sarah.version == 3)
										Sarah.obj.remote({'context' : 'lazyrubric.xml'});
									else
										Sarah.obj.remote({'context' : 'lazyrubric'});	
								});
							}, 1000);	
							end();
							break;
						case 'no':
							Sarah.obj.speak("D'accord. je met ca dans " + _config.defaultCategoryMemo + " par défaut.", function () {
								setTimeout(function(){
									rubric = _config.defaultCategoryMemo;
									askMemoTime();
								}, 1000);	
							});
							end();
							break;
						case 'again':
							setTimeout(function(){
								Sarah.obj.speak("Je t'écoute...", function () {
									fs.removeSync(filepath);
									filememo = null;
									startRecordMemo(manageMemo);
								});
							}, 1000);
							end();
							break;
						case 'cancel':
						default:
							Sarah.obj.speak("annulé.", function () { 
								fs.removeSync(filepath);
								rubric = null;
								CalendarOrMemo = null;
								filememo = null;
							});
							end(true);
							break;
						}
					}, 500);
				});
		} else {
			rubric = _config.defaultCategoryMemo;
			if (_config.rappelMemo == true)
				askMemoTime();
			else
				saveRecord();
		}
	});
	
}




var manageEvent = function(sentence, confidence) {
	
	if (_config.verbose) logger.info(sentence);
	
	if (sentence.toLowerCase().indexOf('annulé') != -1 || sentence.toLowerCase().indexOf('annule') != -1 || sentence.toLowerCase().indexOf('termine') != -1 || sentence.toLowerCase().indexOf('terminé') != -1) {
		Sarah.obj.speak("d'accord");
		return;
	}
	
	Sarah.obj.speak(sentence + ", d'accord. Et pour quand tu veux ca ?", function() {
		CalendarOrMemo = sentence;
		filememo = null;
		
		if (Sarah.version == 3)
			Sarah.obj.remote({'context' : 'lazydays.xml'});	
		else
			Sarah.obj.remote({'context' : 'lazydays'});	
	});
	
}


var listen = function(value, callback) {
	
	var SarahConfig = getConfig('http');
	var uri = (Sarah.version == 3) ? SarahConfig.remote + '?listen=' + value : SarahConfig.remote + "?context=" + ( value ? 'default': '')
	
	if (_config.verbose) logger.info("Sarah remote: %s", uri);
	request(uri, function (error, response, body) {
		if (!error && response.statusCode != 200) 
			logger.error ("Sarah Remote: %s" + error);
		
		if (callback) callback();
	});
}



var setcron = function () {
  
	if (cron) {
		logger.info('Précedent mémo timer stoppé.');
		cron.stop();
	}
	
	var d = new Date();
	var s = d.getSeconds() + _config.timerecord;
	d.setSeconds(s);

	cron = new cronJob(d, function(done) {	
		logger.info('Aucun message. Ecoute stoppée.');
		Sarah.obj.speak("Aucun mémo. Ecoute stoppée.");
		soxkilled = true;
		var process = 'taskkill /T /F /IM sox.exe';
		var exec = require('child_process').exec;
		exec(process, function (error, stdout, stderr) {
			if (error) logger.error('Unable to kill sox: %s', error);
		});
		backToGrammar();
	}, null, true);
	
}




var startRecordMemo = function (callback) {
	
	if (!_config.soxpath || !_config.soxparam) {
		logger.error("Pas de configuration pour écouter...");
		return;
	}
	
	setcron();
	
	listen (false, function () { 
		if (_config.verbose) logger.info("Je t'écoute...");
		
		var file = moment().format("DD-MM-YYYYTHH-mm"),
			filepath = __dirname + '\\record\\memo\\' + file + '.wav',
			process = _config.soxpath + '\\' + _config.soxparam.replace('<FileName>', filepath),
			exec = require('child_process').exec;
		exec(process, function (error, stdout, stderr) {
			if ((error || stderr) && soxkilled == false)
				logger.error("sox error %s", error || stderr);
			else {
				if (soxkilled == false) {
					logger.info("Ecoute stoppée.");
					cron.stop();
					filememo = file;
					
					if (exists('mute') == true)
						Sarah.obj.call('mute', {command : 'autoMute', values : {Cmd: 'askme', Options: {timeout: false}}});
					
					callback();
				} else
					soxkilled = false;
			} 
			listen (true);
		});
	});
	
}



// Démarre l'enregistrement
var startRecordEvent = function(callback) {
	
	listen(false, function(){ 
		if (_config.verbose) logger.info("Je t'écoute...");
		if (!_config.soxpath || !_config.lang || !_config.googleapi) {
			logger.error("Pas de configuration pour écouter...");
			return callback ();
		}
		
		file = fs.createWriteStream(__dirname + '/record/calendar/calendar.wav', { encoding: 'binary' });
		recsound.start({
		  verbose : true,
		  threshold : _config.threshold,
		  soxpath : _config.soxpath
		}).pipe(request.post({
			  'url'     : 'https://www.google.com/speech-api/v2/recognize?output=json&lang='+_config.lang+'&key='+_config.googleapi,
			  'headers' : {
				'Content-Type'  : 'audio/l16;rate=16000'
			  }
			}, function(err, resp, body){ 
				if (body) {
					if (body.indexOf('{"result":[]}\n') != -1)
						body = body.replace('{"result":[]}\n',"");
					if (body && body.length > 0) {
						if (_config.verbose) logger.info(body);
						try {
							body = JSON.parse(body);
						} catch (err) {
							if (_config.verbose) logger.error("Body error: %s", err);
							logger.warn("Restart record...");
							Sarah.obj.speak("recommence", function() { 
								setTimeout(function(){
									startRecordEvent(callback);
								}, 500);
							});	
							return;
						} 
						
						if (body.result && body.result.length > 0) {
							if (_.first(_.first(body.result).alternative).confidence) {
								var confidence = _.first(_.first(body.result).alternative).confidence;
								if (_config.verbose) logger.info("Confidence " + _.first(_.first(body.result).alternative).confidence);
							}
							if (_.first(_.first(body.result).alternative).transcript) {
								var sentence = _.first(_.first(body.result).alternative).transcript;
								listen(true, function() { 
									setTimeout(function(){
										callback (sentence, confidence);
									}, 500);
								});
							}	
						} else {
							logger.warn("Restart record...");
							Sarah.obj.speak("recommence", function() { 
								setTimeout(function(){
									startRecordEvent(callback);
								}, 500);	
							});		
						}
					} else {
						logger.warn("Restart record...");
						Sarah.obj.speak("recommence", function() {
							setTimeout(function(){ 	
								startRecordEvent(callback);
							}, 500);	
						});	
					}	  
				} else {
					if (_config.verbose) logger.info("No core body..."); 
					logger.warn("Restart record...");
					Sarah.obj.speak("recommence", function() { 
						setTimeout(function(){ 
							startRecordEvent(callback);
						}, 500);	
					});
				}
			}));
	});
	
}


var setMonth = function (dayOfWeek){
	
	switch (dayOfWeek) {
		case 'today':
			return moment().format("MMMM");
			break;
		case 'tomorrow':
			return  moment().add(1, 'days').format("MMMM");
			break;
		case 'aftertomorrow':
			return  moment().add(2, 'days').format("MMMM");
			break;
		case 'oneweekmore':
			return moment().add(7, 'days').format("MMMM");
			break;
		case 'twoweekmore':
			return moment().add(14, 'days').format("MMMM");
			break;
		default:
			return moment().add(dayOfWeek, 'days').format("MMMM");
			break;
	}

}



var setYear = function (dayOfWeek){
	
	switch (dayOfWeek) {
		case 'today':
			return moment().format("YYYY");
			break;
		case 'tomorrow':
			return  moment().add(1, 'days').format("YYYY");
			break;
		case 'aftertomorrow':
			return  moment().add(2, 'days').format("YYYY");
			break;
		case 'oneweekmore':
			return moment().add(7, 'days').format("YYYY");
			break;
		case 'twoweekmore':
			return moment().add(14, 'days').format("YYYY");
			break;
		default:
			return moment().add(dayOfWeek, 'days').format("YYYY");
			break;
	}

}


var setDayOfMonth = function(dayOfWeek) {

	switch (dayOfWeek) {
		case 'today':
			return moment().format("D");
			break;
		case 'tomorrow':
			return  moment().add(1, 'days').format("D");
			break;
		case 'aftertomorrow':
			return  moment().add(2, 'days').format("D");
			break;
		case 'oneweekmore':
			return moment().add(7, 'days').format("D");
			break;
		case 'twoweekmore':
			return moment().add(14, 'days').format("D");
			break;
		default:
			return moment().add(dayOfWeek, 'days').format("D");
			break;
	}

}


var setDayOfWeek = function(dayOfWeek) {

	switch (dayOfWeek) {
		case 'today':
			return moment().format("dddd");
			break;
		case 'tomorrow':
			return  moment().add(1, 'days').format("dddd");
			break;
		case 'aftertomorrow':
			return moment().add(2, 'days').format("dddd");
			break;
		case 'oneweekmore':
			return moment().add(7, 'days').format("dddd");
			break;
		case 'twoweekmore':
			return moment().add(14, 'days').format("dddd");
			break;
		default:
			return moment().add(dayOfWeek, 'days').format("dddd");
			break;
	}
}


