var later = require('later');
var core = require('../core');
later.date.localTime();

//console.log("Now Date:"+new Date());

/**
 * 运行本地命令的定时器
 */
var cmdTimer = function(id,cmd,time){
	this.id   = id;
	this.cmd  = cmd;
	this.time = time;
}
cmdTimer.prototype={
	run:function(){
		var obj = this;
		//var sched = later.parse.recur().every(parseInt(obj.time)).second();
		var sched = later.parse.recur().every(parseInt(obj.time)).minute();
		var tmr = later.setInterval(function() {
			core.exec_command_log(obj.id,obj.cmd);
		}, sched);
		obj.tmr = tmr;
	},
	stop:function(){
		this.tmr.clear();
	}
}

/**
 * 运行定时器
 * @param id
 * @param cmd
 * @param time
 */
function callCmdTimer(id,cmd,time){
	var tmr = new cmdTimer(id,cmd,time);
	tmr.run();
	return tmr;
}

/**
 * 运行定时器
 * @param id
 * @param time
 * @param ipAddr
 * @param port
 * @param reqtype
 * @returns {netTimer}
 */
function callNetTimer(id,time,ipAddr,port,reqtype,url){
	var tmr = new netTimer(id,time,ipAddr,port,reqtype,url);
	tmr.run();
	return tmr;
}

/**
 * 网络监控定时器
 */
var netTimer = function(id,time,ipAddr,port,reqtype,url){
	this.id = id;
	this.time = time;
	this.ipAddr = ipAddr;
	this.port = port;
	this.reqtype = reqtype;
	this.url = url;
}
netTimer.prototype={
	run:function(){
		var obj = this;
		var sched = later.parse.recur().every(parseInt(obj.time)).minute();
		var tmr = later.setInterval(function() {
			if(obj.reqtype=='socket'){
				core.checkSocketStatus(obj.ipAddr,obj.port,obj.id);
			}else if(obj.reqtype=='http'){
				core.checkHttpStatus(obj.url,obj.id);
			}else{
				console.log('error:类型错误[reqtype=' + obj.reqtype + ',无此类型代码]');
			}
		}, sched);
		obj.tmr = tmr;
	},
	stop:function(){
		this.tmr.clear();
	}
}

/**
 * 发送心跳信息
 * @param app
 */
function sendUrgentData(app){
	var sched = later.parse.recur().every(app.get('heartTime')).minute();
	var option={
		date:new Date().toLocaleTimeString(),
		ipAddr:app.get('host')
	}
	
	later.setInterval(function() {
		console.log('start.................Heartbeat...........');
		core.postData(app.get('HeartbeatURL'),option,function(res){
			res.on('data', function(chunk) {
		        if(chunk=='ok'){
//		        	console.log(chunk);
		        	return true;
		        }else{//需要异常处理
		        	return false;
		        }
		    });
			
		});
	}, sched);
}


exports.callCmdTimer=callCmdTimer;
exports.callNetTimer=callNetTimer;
exports.sendUrgentData=sendUrgentData;
