/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var core = require('./core');
//var time = require('./util/time');
var fs = require('fs');

var accessLogfile = fs.createWriteStream('./log/access.log', {
	flags : 'a'
});
var errorLogfile = fs.createWriteStream('./log/error.log', {
	flags : 'a'
});

var app = express();

// all environments
app.configure(function() {
	app.use(express.logger({
		stream : accessLogfile
	}));
	app.use(function(err, req, res, next) {
		var meta = '[' + new Date() + '] ' + req.url + '\n';
		errorLogfile.write(meta + err.stack + '\n');
		next();
	});
	app.set('port', process.env.PORT || 3000);
	app.use(express.bodyParser({
		keepExtensions : true,
		uploadDir : './tmp'
	})).use(express.methodOverride());
	app.use(app.router);

	// app
	app.set('cmd-cfg-path', './conf/commands.cfg');
	app.set('net-cfg-path', './conf/nets.cfg');
	
});
routes(app);

var host = core.getLocalIpAddress().toString();

app.set('host',host);
app.set('heartTime','10');
console.log('host:'+host);
//var heartbeat = core.getCfgValueByKey('./conf/cfg.cfg','HeartbeatURL');
//console.log(heartbeat);
//var reportResultURL = core.getCfgValueByKey('./conf/cfg.cfg','reportResultURL');
//console.log(reportResultURL);

//app.set('HeartbeatURL','http://192.168.80.134:3000/monitor');
app.set('HeartbeatURL',core.getCfgValueByKey('./conf/cfg.cfg','HeartbeatURL'));
app.set('reportResultURL',core.getCfgValueByKey('./conf/cfg.cfg','reportResultURL'));


console.log('**********************************************************');
console.log('*            starting agent for ecm                       ');
console.log('*                                                         ');
console.log('*conf path    : ./conf/commands.cfg                       ');
console.log('*conf path    : ./conf/nets.cfg                           ');
console.log('*host         : '+app.get("host")+'                       ');
console.log('*HeartbeatURL : '+app.get('HeartbeatURL')+'               ');
console.log('**********************************************************');


 process.on('uncaughtException', function (err) {
 console.log('Caught exception:'+err);
 });

// inin commands config
core.init(app);

/*同步
core.getCommands(app);
异步
time.initTimer(app);*/



if (!module.parent) {
	app.listen(app.get('port'));
	console.log("Express server listening on port %d in %s mode", app
			.get('port'), app.settings.env);
}
