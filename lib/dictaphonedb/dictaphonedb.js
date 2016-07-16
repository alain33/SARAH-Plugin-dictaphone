/*
	Author: Stéphane Bascher
	
	Date: June-27-2016 - Version: 1.0 - Creation of the module
*/

var moment = require('../moment/moment'),
	fs = require('fs')
	_ = require('../underscore/underscore');
moment.locale('fr');

// Init js
var dictaphonedbClient = module.exports = function (opts) {
	
	//Dirty hack
	dictaphoneobj = this;

	if (!(this instanceof dictaphonedbClient)) {
		return new dictaphonedbClient(opts);
	}
	
	opts = opts || {};
	this.SARAH = this.SARAH || opts.sarah;
	this.sarahConfig = this.sarahConfig || (opts.sarahConfig) ? opts.sarahConfig : null;
	this._config = this._config || opts._config;
	this.verbose = this.verbose || opts.verbose || true ; 
	this.dictaphonedb = this.dictaphonedb || this.dbinit();
	
	// Save action
	this.saveEvent = function (type,rubric,Event,tblTime,file,callback) {this.saveEventdb(type,rubric,Event,tblTime,file,function(result){ 
		callback(result);
	})};
	this.findEvent = function (type, rubric, date, callback) { this.findEventdb (type, rubric, date, function (result) {
		callback(result);	
	})};
	this.removeMemo = function (file, callback) { this.removeMemodb (file, function (result) {  
		callback(result);
	})};
}


// Init dictaphone database
dictaphonedbClient.prototype.dbinit = function () {
	var dbstore = require('../nedb'),
	    dbfile = __dirname + '/../../db/dictaphone.db',
	    db = new dbstore({ filename: dbfile});
	db.loadDatabase();
	return db; 
}


var watchFiles = function (client, callback) {
	
	if (exists('clientManager',client) == true) 
		client.SARAH.trigger('clientManager',{key:'watch', files: [__dirname + '/../../db/dictaphone.db'], done : (callback) ? callback : null });
		
}


var savefile = function() {
	
	var fs = require('fs'),
	    readfile  = fs.readFileSync(__dirname + '/../../db/dictaphone.db','utf8');
	fs.writeFileSync(__dirname + '/../../db/dictaphone.db', readfile, 'utf8');
	
}


var exists = function(cmd,client){
	
  var config = (client.sarahConfig) ? client.sarahConfig : client.SARAH.ConfigManager.getConfig();
  if (config.modules[cmd])
    return true;

  return false;
}


dictaphonedbClient.prototype.removeMemodb  = function (file, callback) {
	var client = this;
	
	file = _.first(_.last(file.split('/')).split("."));
	client.dictaphonedb.findOne({File: file}, function (err, doc) {
			if (err || !doc){
				console.log("Enable to delete mémo file in database.");
				return callback(false);
			}
			
			if (doc) {
				client.dictaphonedb.remove({ _id: doc._id }, function (err, numRemoved) {
					watchFiles(client, function(){ 
						savefile(); 
					});
					setTimeout(function(){
						callback(true);
					}, 500);
				});
			}
	});
	
}


dictaphonedbClient.prototype.findEventdb = function (type, rubric, date, callback) {
	
	// date="+0" date="+3"  date="<3" date="thisWeek"  date="nextWeek"  date="thisMonth"
	var client = this;
	
	var currentTime = moment().format("YYYY-MM-DDTHH:mm"),
		currentTimeNoHour = moment().format("YYYY-MM-DD"),
		currentDay = moment().format("DD"),
		currentHour = moment().format("HH:mm"),
		currentMonth = moment().format("MM"),
		currentYear = moment().format("YYYY");
	
	if (client.verbose == true) console.log("info: Heure courante: " + currentTime);
	
	var operator;
	if (date.indexOf('=') != -1) {
		date = parseInt(date.replace('=',''));
		operator = '+';
	} else if (date.indexOf('<') != -1) {	
		date = parseInt(date.replace('<',''));	
		operator = '<';
	} else
		operator = date;
    
	client.dictaphonedb.find({Type: type}, function (err, docs) {
		if (err){
				console.log("error: Enable to retrieve events items, error: " + err);
				return;
		}
		
	var EventList = [[],[]],
		    pending = docs.length;
		if (pending == 0)
			 return callback (EventList);
		 
		if (client.verbose == true) console.log("info: " + pending + " evénements trouvés");
		
		docs.forEach(function (doc) {
			if (rubric == 'all' || rubric == doc.Rubric) {
				var docHour = (doc.Hour != 'repeat') ? doc.Hour : currentHour,
				    day = (doc.Day != 'All') ? ((doc.Day.length == 1) ? "0" + doc.Day : doc.Day) : currentDay,
				    month = (doc.Month != 'All') ? setMonth(doc.Month) : currentMonth,
				    year = (doc.Year != 'All') ? doc.Year : currentYear,
				    docTime = year+'-'+month+'-'+day+'T'+docHour;
					if (client.verbose == true) console.log("info: Evénement pour le: "+ docTime);
				
				if (moment(docTime).format("YYYY-MM-DDTHH:mm") != 'Invalid date') {
					var startTime,
						maxTime;	
					if (operator == '+' || operator == '<' || operator == 'thisWeek' || operator == 'nextWeek' || operator == 'thisMonth') {
						if (operator == '+' || operator == 'thisWeek' || operator == 'thisMonth')
							startTime = (moment(currentTimeNoHour+'T00:00').add(date, 'days').format("YYYY-MM-DDTHH:mm"))
						else if (operator == 'nextWeek')
							startTime = moment(currentTimeNoHour+'T00:00').add((7 - (moment().weekday() + 1)) + 1, 'days').format("YYYY-MM-DDTHH:mm");
						else
							startTime = currentTime;
						
						if (operator == 'thisWeek')
							maxTime = moment(currentTimeNoHour+'T23:59').add(7 - (moment().weekday() + 1), 'days').format("YYYY-MM-DDTHH:mm");
						else if (operator == 'nextWeek')
							maxTime = moment(currentTimeNoHour+'T23:59').add((7 - (moment().weekday() + 1) + 7), 'days').format("YYYY-MM-DDTHH:mm");
						else if (operator == 'thisMonth')
							maxTime = moment(currentTimeNoHour+'T23:59').add(moment().daysInMonth() - parseInt(currentDay), 'days').format("YYYY-MM-DDTHH:mm");
						else
							maxTime	= moment(currentTimeNoHour+'T23:59').add(date, 'days').format("YYYY-MM-DDTHH:mm");
						
						if (client.verbose == true) {
								console.log("info: date mini de capture: "+ startTime);
								console.log("info: date maxi de capture: "+ maxTime);
						}
						
						if (day < currentDay && (doc.Day == 'All' || doc.Month == 'All' || doc.Year == 'All')) {
							var dayMaxTime,
								monthMaxTime,
								yearMaxTime;
							if (operator == '+' || operator == '<') {	
								dayMaxTime = day;
								monthMaxTime = (doc.Month == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(date, 'days').format("MM")
									: month;
								yearMaxTime = (doc.Year == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(date, 'days').format("YYYY")
									: year;
							} else if (operator == 'thisWeek') {  
								dayMaxTime = day;
								monthMaxTime = (doc.Month == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(7 - (moment().weekday() + 1), 'days').format("MM")
									: month;
								yearMaxTime = (doc.Year == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(7 - (moment().weekday() + 1), 'days').format("YYYY")
									: year;
							} else if (operator == 'nextWeek') {
								dayMaxTime = (doc.Day == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(7 - (moment().weekday() + 1) + 7, 'days').format("D")
									: day;
								monthMaxTime = (doc.Month == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(7 - (moment().weekday() + 1) + 7, 'days').format("MM")
									: month;
								yearMaxTime = (doc.Year == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(7 - (moment().weekday() + 1) + 7, 'days').format("YYYY")
									: year;
							} else if (operator == 'thisMonth') {
								dayMaxTime = (doc.Day == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(moment().daysInMonth() - parseInt(currentDay), 'days').format("D")
									: day;
								monthMaxTime = (doc.Month == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(moment().daysInMonth() - parseInt(currentDay), 'days').format("MM")
									: month;
								yearMaxTime = (doc.Year == 'All') 
									? moment(currentTimeNoHour+'T00:00').add(moment().daysInMonth() - parseInt(currentDay), 'days').format("YYYY")
									: year;	
							}
							if (client.verbose == true) { 
								console.log("info: Nouveau jour: "+ dayMaxTime);
								console.log("info: Nouveau mois: "+ monthMaxTime);	
								console.log("info: Nouvelle année: "+ yearMaxTime);
							}	
							docTime = (month < monthMaxTime) 
									  ? ((year < yearMaxTime) ? yearMaxTime : year)+'-'+monthMaxTime+'-'+dayMaxTime+'T'+docHour 
									  : ((year < yearMaxTime) ? yearMaxTime+'-'+month+'-'+dayMaxTime+'T'+docHour : docTime);
							if (client.verbose == true) console.log("info: Evénement recalculé: "+ docTime);	
						}
						
						if ((moment(docTime).isAfter(startTime) == true && moment(docTime).isBefore(maxTime) == true) ||
							 moment(docTime).isSame(maxTime) == true ||  moment(docTime).isSame(startTime) == true ) {
								if (moment(docTime).isAfter(currentTime) == true || moment(docTime).isSame(currentTime) == true) {
									if (doc.Event) console.log("info: " + doc.Event + " à faire");
									EventList[0].push([doc,docTime]);
								} else {
									if (doc.Event) console.log("info: " + doc.Event + " en retard");
									EventList[1].push([doc,docTime]);
								}
						}
					} else
						console.log("info: Opérateur de date inconnnu.");
				}
			}
			
			if (!--pending) callback (EventList);
		});
	});
	
	
}



// Save memo in db
dictaphonedbClient.prototype.saveEventdb = function (type,rubric,Event,tblTime,file,callback) {
	var client = this;
	
	// New, create
	client.dictaphonedb.insert({
				Type: type,
				Rubric: rubric,
				Event: Event,
				Weekday: (tblTime) ? tblTime.weekday : 'All',
				Day: (tblTime) ? tblTime.day : 'All',
				Month: (tblTime) ? tblTime.month : 'All',
				Year: (tblTime) ? tblTime.year : 'All',
				Hour: (tblTime) ? tblTime.hour : 'repeat',
				File: file
		}, function(err, newDoc){
			if (!newDoc) {
				console.log('error: ' + err);
				callback(false);
			} else {
				watchFiles(client, function(){ 
					savefile(); 
				});
				callback(true);
			}
		});		
}


var setMonth = function (month) {
	
	var months = (_.indexOf(moment.months(), month) + 1).toString();
	return (months.length == 1) ? '0' + months : months;
		
}

