/**
 * @author hetao
 * @see	linux monitor agent for psbc ecm
 * @Email: he.tao@live.com
 * @weibo : http://weibo.com/u/2027119111
 * @version ：V0.1
 */

/**
 * Module dependencies.
 */
var fs = require('fs');
var time = require('./util/time');
var http = require('http');
var net = require('net');
// console.log(getSysDate("yyyy-MM-dd hh:mm:ss"));
var reportResultURL = '';
var localAddr = '';

var exec = require("child_process").exec;

/**
 * 初始化监控命令的配置文件
 */
function init(app) {
	//初始化本机命令监控配置文件
	var commands = cfg2Map(app,app.get('cmd-cfg-path'),function(){return new cmdcfg();});
	app.set('commands', commands);
	//启动所有定时器
	runCmdM(app);

	//初始化网络监控配置文件
	var nets = cfg2Map(app,app.get('net-cfg-path'),function(){return new netcfg();});
	app.set('nets', nets);
	//启动所有定时器
	rumNetM(app);
	
	//发送心跳信息
	time.sendUrgentData(app);
	
	reportResultURL = app.get('reportResultURL');
	localAddr = app.get('host');
}
exports.init = init;



/**
 * 将配置文件转换为Map
 * @param app
 * @param cfgPath
 * @param fn
 * @returns {HashMap}
 */
function cfg2Map(app,cfgPath,fn){
	if (!fs.existsSync(cfgPath)) {
		var fd = fs.openSync(cfgPath, 'w+');
		fs.closeSync(fd);
	}
	var data = fs.readFileSync(cfgPath, 'utf-8');
	var remaining = '';
	remaining += data;
	var index = remaining.indexOf('\n');
	var hMap = new HashMap();
	while (index > -1) {
		var line = remaining.substring(0, index);
		remaining = remaining.substring(index + 1);
		if (!line.startWith('#')) {
			var cfg = fn();
			cfg.parse(line);
			hMap.put(cfg.id, cfg.toJson());
		}
		index = remaining.indexOf('\n');
	}
	return hMap;
}

/**
 * 启动定时器
 * @param app
 */
function runCmdM(app) {
	// 定时器管理对象
	var timerMap = new HashMap();
	runMap(app,'commands',timerMap,timerType.cmd);
	app.set('timerMap', timerMap);
}

/**
 * 启动定时器
 * @param app
 */
function rumNetM(app) {
	var timerNetMap = new HashMap();
//	parseCfg2NetMap(app, timerNetMap);
	runMap(app,'nets',timerNetMap,timerType.net);
	app.set('timerNetMap', timerNetMap);
}

/**
 * 定时器类型
 */
var timerType = {
	cmd : 'cmd' ,
	net : 'net'
}

/**
 * 解析JSON串并启动定时器
 * @param app
 * @param mapName
 * @param timerMap
 * @param type
 * @returns
 */
function runMap(app,mapName,timerMap,type){
	var cfgMap = app.get(mapName);
	var mapSize = cfgMap.size();
	for (var i = 0; i < mapSize; i++) {
		if(timerType.cmd == type){
			console.log('starting '+type+' monitor: ' + cfgMap.get(cfgMap.keys()[i]));
			var cf = new cmdcfg();
			cf.parse(cfgMap.get(cfgMap.keys()[i]));
			var tmr = time.callCmdTimer(cf.id, cf.cmd, cf.minute);
			timerMap.put(cf.id, tmr);
		}else if(timerType.net == type){
			console.log('starting '+type+' monitor: ' + cfgMap.get(cfgMap.keys()[i]));
			var cfnet = new netcfg();
			cfnet.parse(cfgMap.get(cfgMap.keys()[i]));
			var tmr = time.callNetTimer(cfnet.id, cfnet.minute, cfnet.ipAddr,
					cfnet.port, cfnet.reqtype,cfnet.desc);
			timerMap.put(cfnet.id, tmr);
		}
	}
	return timerMap;
}

/****************************************************************
 * 							CMD									*
 ****************************************************************/

/**
 * 启动所有定时器-CMD
 * @param app
 * @param res
 */
function startAllCmd(app, res) {
	var timerMap = app.get('timerMap');
	// 先停止所有的定时器
	stopAllCmd(app, res, false);
	// 从环境变量中启动
	runMap(app,'commands',timerMap,timerType.cmd);
	var ret = new retMsg(retCode.success,retCode.msg1);
	res.send(ret.toJson());
	res.end();
}
exports.startAllCmd = startAllCmd;

/**
 * 停止所有定时器-CMD
 * @param app
 * @param res
 * @param isr
 *            是否在需要在res中返回
 */
function stopAllCmd(app, res, isr) {
	var timerMap = app.get('timerMap');
	var mapsize = timerMap.size();
	for (var j = 0; j < mapsize; j++) {
		console.log('stop cmd ID :[' + timerMap.keys()[j] + ']');
		var tmr = timerMap.get(timerMap.keys()[j]);
		tmr.stop();
	}
	timerMap.clear();
	if (isr) {
		var ret = new retMsg(retCode.success,retCode.msg2);
		res.send(ret.toJson());
		res.end();
	}
}
exports.stopAllCmd = stopAllCmd;

/**
 * 通过ID，从配置文件中读取配置信息后启动定时器
 * 
 * @param app
 * @param cmdId
 * @param res
 */
function startCmdByID(app, cmdId, res) {
	var cfgMap = app.get('commands');// 配置文件
	if (!cfgMap.containsKey(cmdId)) {
		res.send(new retMsg(retCode.failed,'error:在配置文件中，无此ID[' + cmdId + ']信息！').toJson() );
		res.end();
		return;
	}
	var timerMap = app.get('timerMap');// 定时器管理对象
	if (timerMap.containsKey(cmdId)) {
		res.send(new retMsg(retCode.failed,'error:此ID[' + cmdId + ']定时器已在运行中，无法再次启动！').toJson());
		res.end();
		return;
	}
	var cf = new cmdcfg();
	cf.parse(cfgMap.get(cmdId));
	// 启动定时器
	var tmr = time.callCmdTimer(cf.id, cf.cmd, cf.minute);
	console.log('start cmd ID : [' + cf.id + ']');
	timerMap.put(cf.id, tmr);
	res.send(new retMsg(retCode.success,'定时器ID[' + cmdId + '],已启动运行！运行命令[' + cf.cmd + ']').toJson());
	res.end();
}
exports.startCmdByID = startCmdByID;

/**
 * 根据ID停止定时器-CMD
 * 
 * @param app
 * @param cmdId
 * @param res
 */
function stopCmdByID(app, cmdId, res) {
	var timerMap = app.get('timerMap');
	if (!timerMap.containsKey(cmdId)) {
		res.send(new retMsg(retCode.failed,'error:运行中的定时器，无此ID[' + cmdId + ']！').toJson());
		res.end();
		return;
	}
	var tmr = timerMap.get(cmdId);
	tmr.stop();
	timerMap.remove(cmdId);
	console.log('stop cmd ID : [' + cmdId + ']');
	res.send(new retMsg(retCode.success,'定时器ID[' + cmdId + '],停止运行成功！').toJson() );
	res.end();
}
exports.stopCmdByID = stopCmdByID;

/**
 * 增删改定时器运行命令-CMD
 * 
 * @param app
 * @param res
 * @param id
 * @param cmd
 * @param optype
 * @param desc
 * @param minute
 */
function editCmdCfg(app, res, id, cmd, optype, desc, minute) {
	var cfg = new cmdcfg();
	cfg.toObj(id, cmd, optype, desc, minute);
	var data = reWriteCfg(app,'commands' ,cfg,function(){return new cmdcfg();});
	if (data.startWith('error')) {
		res.send(new retMsg(retCode.failed,data).toJson());
		res.end();
	} else {
		// 备份源文件
		var cfgPath = __dirname
				+ app.get('cmd-cfg-path').substring(1,
						app.get('cmd-cfg-path').length);
		var bakPath = cfgPath + '_' + getSysDate("yyyy-MM-dd_hh-mm-ss");
		// new copyFile(cfgPath,bakPath);
		// 生成新的配置文件

		var readable, writable;
		readable = fs.createReadStream(cfgPath);
		writable = fs.createWriteStream(bakPath);
		readable.pipe(writable);
		writable.on('close', function() {
			console.log('生成备份文件[' + bakPath + ']');
			fs.writeFile(app.get('cmd-cfg-path'), data, 'utf-8',
					function(error) {
						if (error) {
							throw new error;
						} else {
							res.send(new retMsg(retCode.success,retCode.msg3).toJson());
							res.end();
						}
					});
		});

	}
}
exports.editCmdCfg = editCmdCfg;

/**
 * 列出所有已定义的定时器运行状态-CMD
 * 
 * @param app
 * @param res
 */
function listTimerStatus(app, res) {
	var cfgMap = app.get('commands');
	var timerMap = app.get('timerMap');
	var lst = new Array();
	var mapSize = cfgMap.size();
	for (var i = 0; i < mapSize; i++) {
		var cf = new cmdcfg();
		var obj = new Object();
		cf.parse(cfgMap.get(cfgMap.keys()[i]));
		obj.id = cf.id;
		obj.cmd = cf.cmd;
		obj.cdesc = cf.desc;
		obj.minute = cf.minute;
		if (timerMap.containsKey(cfgMap.keys()[i]))
			obj.status = 'running';
		else
			obj.status = 'stop';
		lst.push(obj);
	}
	res.send(JSON.stringify(lst));
	res.end();
}
exports.listTimerStatus = listTimerStatus;

/****************************************************************
 * 							NET									*
 ****************************************************************/

/**
 * 启动所有定时器-NET
 * @param app
 * @param res 
 */
function startAllNet(app, res) {
	var timerMap = app.get('timerNetMap');
	// 先停止所有的定时器
	stopAllNet(app, res, false);
	// 从环境变量中启动
	runMap(app,'nets',timerMap,timerType.net);
	res.send(new retMsg(retCode.success,retCode.msg1).toJson());
	res.end();
}
exports.startAllNet = startAllNet;

/**
 * 停止所有定时器-NET
 * @param app
 * @param res
 * @param isr
 */
function stopAllNet(app, res, isr) {
	var timerMap = app.get('timerNetMap');
	var mapsize = timerMap.size();
	for (var j = 0; j < mapsize; j++) {
		console.log('stop cmd ID :[' + timerMap.keys()[j] + ']');
		var tmr = timerMap.get(timerMap.keys()[j]);
		tmr.stop();
	}
	timerMap.clear();
	if (isr) {
		res.send(new retMsg(retCode.success,retCode.msg2).toJson());
		res.end();
	}
}
exports.stopAllNet = stopAllNet;

/**
 * 通过ID，从配置文件中读取配置信息后启动定时器-NET
 * @param app
 * @param netId
 * @param res
 */
function startNetByID(app, netId, res) {
	var cfgMap = app.get('nets');// 配置文件
	if (!cfgMap.containsKey(netId)) {
		res.send(new retMsg(retCode.failed,'error:在配置文件中，无此ID[' + netId + ']信息！').toJson());
		res.end();
		return;
	}
	var timerMap = app.get('timerNetMap');// 定时器管理对象
	if (timerMap.containsKey(netId)) {
		res.send(new retMsg(retCode.failed,'error:此ID[' + netId + ']定时器已在运行中，无法再次启动！').toJson());
		res.end();
		return;
	}
	var cf = new netcfg();
	cf.parse(cfgMap.get(netId));
	// 启动定时器
	var tmr = time.callNetTimer(cf.id, cf.minute, cf.ipAddr, cf.port,
			cf.reqtype,cf.desc);
	console.log('start net ID : [' + cf.id + ']');
	timerMap.put(cf.id, tmr);
	res.send(new retMsg(retCode.success,'定时器ID[' + netId + '],已启动运行！运行命令[' + cf.ipAddr + ':' + cf.port
			+ ']').toJson());
	res.end();
}
exports.startNetByID = startNetByID;

/**
 * 根据ID停止定时器-NET
 * @param app
 * @param netId
 * @param res
 */
function stopNetByID(app, netId, res) {
	var timerMap = app.get('timerNetMap');
	if (!timerMap.containsKey(netId)) {
		res.send(new retMsg(retCode.failed, 'error:运行中的定时器，无此ID[' + netId + ']！').toJson());
		res.end();
		return;
	}
	var tmr = timerMap.get(netId);
	tmr.stop();
	timerMap.remove(netId);
	console.log('stop net ID : [' + netId + ']');
	res.send(new retMsg(retCode.success,'定时器ID[' + netId + '],停止运行成功！').toJson());
	res.end();
}
exports.stopNetByID = stopNetByID;

/**
 * 增删改定时器运行命令-Net
 * @param app
 * @param res
 * @param id
 * @param ipAddr
 * @param port
 * @param reqtype
 * @param optype
 * @param desc
 * @param minute
 */
function editNetCfg(app, res, id, ipAddr, port, reqtype, optype, desc, minute) {
	var cfgNet = new netcfg();
	cfgNet.toObj(id, ipAddr, port, reqtype, optype, desc, minute);
	var data = reWriteCfg(app,'nets',cfgNet,function(){return new netcfg();});
	if (data.startWith('error')) {
		res.send(new retMsg(retCode.failed,data).toJson());
		res.end();
	} else {
		// 备份源文件
		var cfgPath = __dirname
				+ app.get('net-cfg-path').substring(1,
						app.get('net-cfg-path').length);
		var bakPath = cfgPath + '_' + getSysDate("yyyy-MM-dd_hh-mm-ss");
		var readable, writable;
		readable = fs.createReadStream(cfgPath);
		writable = fs.createWriteStream(bakPath);
		// console.log(readable);
		readable.pipe(writable);
		writable.on('close', function() {
			console.log('生成备份文件[' + bakPath + ']');
			fs.writeFile(app.get('net-cfg-path'), data, 'utf-8',
					function(error) {
						if (error) {
							console.log(error)
							throw new error;
						} else {
							res.send(new retMsg(retCode.success,retCode.msg3).toJson());
							res.end();
						}
					});
		});
	}
}
exports.editNetCfg = editNetCfg;

/**
 * 列出所有已定义的定时器运行状态-NET
 * @param app
 * @param res
 */
function listNetTimerStatus(app, res) {
	var cfgMap = app.get('nets');
	var timerMap = app.get('timerNetMap');
	var lst = new Array();
	var mapSize = cfgMap.size();
	for (var i = 0; i < mapSize; i++) {
		var cf = new netcfg();
		var obj = new Object();
		cf.parse(cfgMap.get(cfgMap.keys()[i]));
		obj.id = cf.id;
		obj.ipAddr = cf.ipAddr;
		obj.port = cf.port;
		obj.reqtype = cf.reqtype;
		obj.optype = cf.optype;
		obj.cdesc = cf.desc;
		obj.minute = cf.minute;
		if (timerMap.containsKey(cfgMap.keys()[i]))
			obj.status = 'running';
		else
			obj.status = 'stop';
		lst.push(obj);
	}
	res.send(JSON.stringify(lst));
	res.end();
}
exports.listNetTimerStatus = listNetTimerStatus;

/**
 * 通过ID手动检测网络状态（测试）
 * @param app
 * @param supRes
 * @param netId
 */
function runNetCheckByID(app,supRes,netId){
	var cfgNetMap = app.get('nets');
	if(!cfgNetMap.containsKey(netId)){
		supRes.send(new retMsg(retCode.failed,'无此ID['+netId+']对应的配置信息').toJson());
		supRes.end();
		return;
	}
	var cfg = new netcfg();
	cfg.parse(cfgNetMap.get(netId));
	if( cfg.reqtype == reqType.socket ){//socket处理
		socketCheck(cfg.ipAddr,cfg.port,supRes);
	}else if(cfg.reqtype == reqType.http ){//http处理
		httpCheck(cfg.desc,supRes);
	}
}
exports.runNetCheckByID = runNetCheckByID;

/**
 * 通过IP地址和端口手动检测（需要增加HTTP检测）
 * @param app
 * @param supRes
 * @param ipAddr
 * @param port
 * @param reqtype	监控类型
 * @param desc		http URL
 */
function runNetCheckByIpAddr(app,supRes,ipAddr,port,reqtype,desc){
	if(reqtype == reqType.socket){
		socketCheck(ipAddr,port,supRes);
	}else if(reqtype == reqType.http){
		httpCheck(desc,supRes);
	}
}
exports.runNetCheckByIpAddr = runNetCheckByIpAddr;

/**
 * socket	check
 * @param ipAddr
 * @param port
 * @param supRes
 */
function socketCheck(ipAddr,port,supRes){
	var client = new socketClient(ipAddr,port);
	client.send('status',function(data){
		if(data == 'ok'){//服务正常
			supRes.send(new retMsg(retCode.success,ipAddr+':'+port+retCode.msg4).toJson());
		}else{//服务 异常
			supRes.send(new retMsg(retCode.failed,ipAddr+':'+port+retCode.msg5).toJson());
		}
		supRes.end();
	});
	client.client.on('timeout',function(){
		supRes.send(new retMsg(retCode.failed,ipAddr+':'+port+retCode.msg5).toJson());
		supRes.end();
	});
}

/**
 * http	check
 * @param url
 * @param supRes
 */
function httpCheck(url,supRes){
	var rs = new postData(url, {id:1},function(res){
		res.on('data', function(chunk) {
			if(chunk == 'ok'){//服务正常
				supRes.send(new retMsg(retCode.success,'['+url+']'+retCode.msg4).toJson());
			}else{//服务 异常
				supRes.send(new retMsg(retCode.failed,'['+url+']'+retCode.msg5).toJson());
			}
			supRes.end();
		});
	});
}

/****************************************************************
 * 							NET	END								*
 ****************************************************************/

/**
 * 操作类型代码
 */
var opType = {
	add : 1,
	edit : 0,
	del : -1
}

/**
 * 请求类型代码
 */
var reqType = {
	http : 'http',
	socket : 'socket'
}

/**
 * 重置缓存中的命令配置Map
 * @param app
 * @param cfgName
 * @param cfg
 * @param fn
 * @returns {String}
 */
function reWriteCfg(app, cfgName,cfg,fn) {
	var cfgMap = app.get(cfgName);
	// 处理map
	switch (parseInt(cfg.optype)) {
	case opType.add:
		console.log('add');
		if (cfgMap.containsKey(cfg.id)) {
			return 'error:[ID=' + cfg.id + '已存在。]';
		}
		cfgMap.put(cfg.id, cfg.toJson());
		break;
	case opType.edit:
		console.log('edit');
		if (!cfgMap.containsKey(cfg.id)) {
			return 'error:[ID=' + cfg.id + '不存在。]';
		}
		cfgMap.put(cfg.id, cfg.toJson());
		break;
	case opType.del:
		console.log('del');
		if (!cfgMap.containsKey(cfg.id)) {
			return 'error:[ID=' + cfg.id + '不存在。]';
		}
		cfgMap.remove(cfg.id);
		break;
	default:
		return 'error:操作类型错误[optype=' + cfg.optype + ',无此操作代码]';
	}
	return getMapToJson(cfgMap,fn);
}

/**
 * 将缓存的命令配置按记录转换为JSON
 * @param cfgMap
 * @param fn
 * @returns {String}
 */
function getMapToJson(cfgMap,fn) {
	var jsonData = '#监控命令配置文件\n';
	var mapSize = cfgMap.size();
	for (var i = 0; i < mapSize; i++) {
		var cfg = fn();
		cfg.parse(cfgMap.get(cfgMap.keys()[i]));
		jsonData += '#' + cfg.desc + '\n';
		jsonData += cfg.toJson() + '\n';
	}
	return jsonData;
}

/**
 * 复制文件,需要判断是否是文件
 * 
 * @param src
 *            需要复制的文件
 * @param dst
 *            生成的复制文件
 */
var copyFile = function(src, dst) {
	var readable, writable;
	readable = fs.createReadStream(src);
	writable = fs.createWriteStream(dst);
	readable.pipe(writable);
}

/**
 * 需要http-post包
 * @param url
 * @param option
 
function postData_Deprecated(url, option) {
	http.post(url, option, function(res) {
		res.setEncoding('utf-8');
		res.on('data', function(chunk) {
			if (chunk == 'ok') {
				console.log(chunk);
				return true;
			} else {
				return false;
			}
		});
	});
}*/

//new postData('http://192.168.80.1:8080/poc/DemoAction.action?method=download',{appId:1},function(){});



/**
 * client post
 * @param options
 * @param data
 * @param fn
 */
function postData(options, data, fn) {
	data = require('querystring').stringify(data);
	var length = data.length;
	var contentType = 'application/x-www-form-urlencoded';
	if (typeof (fn) != 'function') {
		fn = function() {
		};
	}

	if (typeof (options) == 'string') {
		var options = require('url').parse(options);
	}
	options.method = 'POST';
	options.headers = {
		'Content-Type' : contentType,
		'Content-Length' : length
	};
	
	var req = require('http').request(options, function(res) {
		res.on('end', function() {
			res.destroy();
		});
		res.setEncoding('utf-8');
		fn(res);
	});
	this.req = req;
	req.setTimeout(5000, function(){
		req.abort();
	});
	req.on('error', function(err) {
		req.abort();
		console.warn('We ignore this post exception :post data error ['+err+']');
	});
	req.write(data);
	req.end();
}
exports.postData = postData;

/**
 * 通过socket连接发送消息
 * @param ipAddr
 * @param port
 */
var socketClient = function(ipAddr,port) {
	this.ipAddr = ipAddr;
	this.port = port;
}
socketClient.prototype = {
	send:function(msg,fn){
		var client = net.connect({port : this.port,host : this.ipAddr}, function() {
			console.log('client connected');
			client.write(msg+'\r\n');
		});
		this.client = client;
		client.setTimeout(5000, function(){});
		client.on('data', function(data) {
			fn(data.toString());
			client.end();
		});
		client.on('end', function() {
			client.destroy();
			console.log('client disconnected');
		});
		var obj = this;
		client.on('timeout',function(){
			console.log('connect ot server['+obj.ipAddr+':'+obj.port+'] is timeout...');
			client.destroy();
		});
	}
}

/**
 * 检查socket服务,返回OK-不带回车换行,认为服务正常(need test)
 * @param ipAddr
 * @param port
 */
function checkSocketStatus(ipAddr,port,id){
	var client = new socketClient(ipAddr,port);
	client.send('status',function(data){//汇报给监控服务
		var reJson;
		if(data == 'ok'){
			reJson = new retMsg(retCode.success,retCode.msg4);
		}else{
			reJson = new retMsg(retCode.failed,retCode.msg5);
		}
		var reData = {
			id:id,
			eventId:-1,
			ipAddr:localAddr,
			type:execType.net,
			result:reJson.toJson()
		}
		postData(reportResultURL,reData,function(){});
	});
	client.client.on('timeout',function(){
		var reData = {
			id:id,
			eventId:-1,
			ipAddr:localAddr,
			type:execType.net,
			result:new retMsg(retCode.failed,retCode.msg5).toJson()
		}
		postData(reportResultURL,reData,function(){});
		return;
	});
}
exports.checkSocketStatus=checkSocketStatus;

/**
 * 检查http服务，返回OK-不带回车换行,认为服务正常(need test)
 * @param url
 * @param id
 */
function checkHttpStatus(url,id){
	var rs = new postData(url, {id:1},function(res){
		res.on('data', function(chunk) {
				var reData = {
					id:id,
					eventId:-1,
					ipAddr:localAddr,
					type:execType.net,
				};
			if(chunk == 'ok'){//服务正常
				reData.result=new retMsg(retCode.success,retCode.msg4).toJson();
				postData(reportResultURL,reData,function(){});
			}else{//服务 异常
				reData.result=new retMsg(retCode.failed,retCode.msg5).toJson();
				postData(reportResultURL,reData,function(){});
			}
		});
	});
	rs.req.on('timeout',function(){
		var reData = {
			id:id,
			eventId:-1,
			ipAddr:localAddr,
			type:execType.net,
		};
		reData.result=new retMsg(retCode.failed,retCode.msg5).toJson();
		postData(reportResultURL,reData,function(){})
	});
}
exports.checkHttpStatus=checkHttpStatus;

/**
 * 下载文件
 * @param option
 */
function downloadFile(option){
	var data={appId:option.appId};
	if(!option.filePath.endWith('/')){
		option.filePath = option.filePath+'/';
	}
	var path = option.filePath+option.fileName;
	var options= require('url').parse(option.url);
    options.method = 'POST';
    var reData={
		id:-1,
		eventId:option.eventId,
		ipAddr:localAddr,
		type:execType.download
	}
    
    var req = http.request(options, function(res) {
        var writestream = fs.createWriteStream(path);
        writestream.on('error',function(err){
        	//下载失败！
        	reData.result=new retMsg(retCode.failed,retCode.msg8).toJson();
        	postData(reportResultURL,reData,function(){});
        });
        writestream.on('close', function() {
        	//汇报下载成功！
        	reData.result=new retMsg(retCode.success,retCode.msg7).toJson();
        	postData(reportResultURL,reData,function(){});
        });
        res.pipe(writestream);
        res.on('end', function() {
			res.destroy();
		});
    });
	req.end();
	req.on('error', function(err) {
		//汇报下载失败！
		reData.result=new retMsg(retCode.failed,retCode.msg8).toJson();
    	postData(reportResultURL,reData,function(){});
		console.warn('We ignore this post exception :downfile report status error ['+err+']');
		req.abort();
	});
	
}
exports.downloadFile=downloadFile;

//downloadFile({url:'http://192.168.80.1:8080/poc/DemoAction.action?method=download',appId:1});

/**
 * 编辑shell脚本
 * @param data
 * @param path
 * @param res
 */
function editShell(data,path,res){
//	console.log(data);
	data = data.replace(/\r\n/g,"\n");
//	console.log(data);
	fs.writeFile(path, data,'utf-8',function(error) {
		if (error) {
			res.send(new retMsg(retCode.failed,retCode.msg10+':'+error).toJson());
			res.end();
			throw new error;
		} else {
			fs.chmodSync(path,'711');
			res.send(new retMsg(retCode.success,retCode.msg6).toJson());
			res.end();
		}
	});
}
exports.editShell=editShell;

/**
 * 格式化系统时间
 * 
 * @param fmt
 * @returns
 */
function getSysDate(fmt) {
	Date.prototype.format = function(format) {
		/*
		 * eg:format="YYYY-MM-dd hh:mm:ss";
		 */
		var o = {
			"M+" : this.getMonth() + 1, // month
			"d+" : this.getDate(), // day
			"h+" : this.getHours(), // hour
			"m+" : this.getMinutes(), // minute
			"s+" : this.getSeconds(), // second
			"q+" : Math.floor((this.getMonth() + 3) / 3), // quarter
			"S" : this.getMilliseconds()
		// millisecond
		}
		if (/(y+)/.test(format)) {
			format = format.replace(RegExp.$1, (this.getFullYear() + "")
					.substr(4 - RegExp.$1.length));
		}
		for ( var k in o) {
			if (new RegExp("(" + k + ")").test(format)) {
				format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k]
						: ("00" + o[k]).substr(("" + o[k]).length));
			}
		}
		return format;
	}
	var day = new Date().format(fmt);
	return day;
}



/**
 * 执行结果实时返回
 * @param command
 * @param res
 */
function exec_command_res(command,res){
	exec(command,function(error,stdout,stderr){
		if(error){
			res.write(new retMsg(retCode.failed,""+error).toJson());
		} else {
			res.write(new retMsg(retCode.success,stdout).toJson());
		}
		res.end();
	});
}
exports.exec_command_res=exec_command_res;

/**
 * 执行结果汇报给server
 * @param id
 * @param command
 */
function exec_command_log(id,command){
	var reData = {
		id:id,
		eventId:-1,
		ipAddr:localAddr,
		type:execType.local
	}
	exec(command,function(error,stdout,stderr){
		if(error){
			reData.result=new retMsg(retCode.failed,""+error).toJson();
		} else {
			reData.result=new retMsg(retCode.success,stdout).toJson();
		}
		postData(reportResultURL,reData,function(){});
	});
}
exports.exec_command_log=exec_command_log;

/**
 * 
 * @param command
 * @param eventId
 * @param res
 * @param isRunBack	是否后台运行
 */
function rodoJob(command,eventId,res,isRunBack){
	var reData = {
		id:-1,
		eventId:eventId,
		ipAddr:localAddr,
		type:execType.redoJob
	}
	if(isRunBack=='true'){
		res.write(new retMsg(retCode.success,retCode.msg9).toJson());
		res.end();
	}
	exec(command,function(error,stdout,stderr){
		if(error){
			reData.result=new retMsg(retCode.failed,""+error).toJson();
		} else {
			reData.result=new retMsg(retCode.success,stdout).toJson();
		}
		if(isRunBack=='true'){
			postData(reportResultURL,reData,function(){});
		}else{
			res.write(JSON.stringify(reData));
			res.end();
		}
	});
}
exports.rodoJob=rodoJob;

/****************************************************************
 * 							util function    					*
 ****************************************************************/

/**
 * netcfg
 */
var netcfg = function() {
}
netcfg.prototype = {
	toJson : function() {
		return JSON.stringify(this);
	},
	parse : function(json) {
		var obj = JSON.parse(json);
		this.id = obj.id;
		this.ipAddr = obj.ipAddr;
		this.port = obj.port;
		this.reqtype = obj.reqtype;
		this.optype = obj.optype;
		this.desc = obj.desc;
		this.minute = obj.minute;
	},
	toObj : function(id, ipAddr, port, reqtype, optype, desc, minute) {
		this.id = id;
		this.ipAddr = ipAddr;
		this.port = port;
		this.reqtype = reqtype;
		this.optype = optype;
		this.desc = desc;
		this.minute = minute;
	}
}

/**
 * cmdcfg
 */
var cmdcfg = function() {
}
cmdcfg.prototype = {
	toJson : function() {
		return JSON.stringify(this);
		;
	},
	parse : function(json) {
		var obj = JSON.parse(json);
		this.id = obj.id;
		this.cmd = obj.cmd;
		this.optype = obj.optype;
		this.desc = obj.desc;
		this.minute = obj.minute;
	},
	toObj : function(id, cmd, optype, desc, minute) {
		this.id = id;
		this.cmd = cmd;
		this.optype = optype;
		this.desc = desc;
		this.minute = minute;
	},
	get : function() {
		console.log(this);
		return this;
	}
}

/**
 * 匹配字符串开头字母
 */
String.prototype.startWith = function(str) {
	if (str == null || str == "" || this.length == 0
			|| str.length > this.length)
		return false;
	if (this.substr(0, str.length) == str)
		return true;
	else
		return false;
	return true;
}

/**
 * 匹配字符串结尾字母
 */
String.prototype.endWith = function(str) {
	if (str == null || str == "" || this.length == 0
			|| str.length > this.length)
		return false;
	if (this.substr(this.length-str.length, this.length) == str)
		return true;
	else
		return false;
	return true;
}

var os=require('os');
/**
 * 获取本机IP
 */
function getLocalIpAddress(){
//	var ifaces=os.networkInterfaces(); 
//  console.log(ifaces);
//	for (var dev in ifaces) {
//	    ifaces[dev].forEach(function(details){
//			if(details.family === 'IPv4' && details.address !== '127.0.0.1' && !details.internal){
//				//console.log(details.address);
//				return details.address;
//			}
//	    });
//	}
//	for (var dev in ifaces) {
//		for(var details in ifaces[dev]){
//			if(ifaces[dev][details].family === 'IPv4' && ifaces[dev][details].address !== '127.0.0.1' && !ifaces[dev][details].internal){
//				console.log(ifaces[dev][details].address);
//				return ifaces[dev][details].address;
//			}
//		}
//	}
	return execSync("hostname -i|awk '{printf $1}'");
}
exports.getLocalIpAddress=getLocalIpAddress;

/**
 * 同步执行
 */
function execSync(command) {
	exec(command + ' 2>&1 1>output && echo done! > done');

	// 阻塞事件循环，知道命令执行完
	while (!fs.existsSync('done')) {
	// 什么都不做
	}

	// 读取输出
	var output = fs.readFileSync('output');

	// 删除临时文件。
	fs.unlinkSync('output');
	fs.unlinkSync('done');
	return output;
}

/**
  * 根据key从配置文件中读取Value
  */
function getCfgValueByKey(cfgPath,key){
    var data = fs.readFileSync(cfgPath,'utf-8');
    var index = data.indexOf('\n');
    var ret = '';
    while(index > -1){
        var line = data.substring(0,index);
        data = data.substring(index + 1);
        if(line.startWith(key)){
            ret = line.substring(key.length+1,line.length);
        }
        index = data.indexOf('\n');
    }
    return ret;
}
exports.getCfgValueByKey=getCfgValueByKey;



/*
 * 检查对象参数是否为空
 */
function checkIsNull(params){
	for(items in params){
		if(undefined == params[items]){
			return true;
		}
	}
	return false;
}
exports.checkIsNull = checkIsNull;

/**
 * HashMap
 */
function HashMap() {
	var size = 0;
	var entry = new Object();
	this.put = function(key, value) {
		if (!this.containsKey(key)) {
			size++;
		}
		entry[key] = value;
	}
	this.get = function(key) {
		return this.containsKey(key) ? entry[key] : null;
	}
	this.remove = function(key) {
		if (this.containsKey(key) && (delete entry[key])) {
			size--;
		}
	}
	this.containsKey = function(key) {
		return (key in entry);
	}
	this.containsValue = function(value) {
		for ( var prop in entry) {
			if (entry[prop] == value) {
				return true;
			}
		}
		return false;
	}
	this.values = function() {
		var values = new Array();
		for ( var prop in entry) {
			values.push(entry[prop]);
		}
		return values;
	}
	this.keys = function() {
		var keys = new Array();
		for ( var prop in entry) {
			keys.push(prop);
		}
		return keys;
	}
	this.size = function() {
		return size;
	}
	this.clear = function() {
		size = 0;
		entry = new Object();
	}
}

/**
 * 操作类型
 */
var execType = {
	local:1,
	net:2,
	redoJob:3,
	download:4
}

/**
 *	return code emun
 */
var retCode={
	success:0,
	failed:-1,
	msg1:'启动成功！',
	msg2:'所有定时器已停止运行！',
	msg3:'更新成功!',
	msg4:'服务正常运行!',
	msg5:'服务异常!',
	msg6:'操作成功！',
	msg7:'下载成功！',
	msg8:'下载失败！',
	msg9:'提交成功！',
	msg10:'上传失败！'
}

/**
 * 返回结果
 */
var retMsg=function(code,msg){
	this.code = code;
	this.msg = msg
}
retMsg.prototype={
	toString:function(){
		console.log('code:'+this.code+' msg:'+this.msg);
	},
	toJson:function(){
		return JSON.stringify(this);
	}
}

