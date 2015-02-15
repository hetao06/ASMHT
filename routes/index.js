/*
 * GET home page.
 */
var exec = require('child_process').exec;
var core = require('../core');
var transfert = require('../transfert');

module.exports = function(app) {
	/**
	 * 从服务上下载文件,并生成在制定目录下
	 */
	app.post('/downloadApp', function(req, res) {
		var option = {
			appId:req.body.appId,
			url:req.body.url+'?appId='+req.body.appId,
			fileName:req.body.fileName,
			filePath:req.body.filePath,
			eventId:req.body.eventId
		}
		var obj = {code:0,msg:' prepare to download fileId :'+option.appId};
		if(core.checkIsNull(option)){
			obj = {code:-1,msg:'need require paramter：'+option};
			res.send(JSON.stringify(obj));
			res.end();
			return;
		};
		res.send(JSON.stringify(obj));
		res.end();
		console.log('start to download file:'+option.fileName);
		core.downloadFile(option);
	});

	app.post('/execShell', function(req, res) {
		res.writeHead(200, {
			"Content-Type" : "text/plain"
		});
		core.exec_command_res(req.body.command, res);
	});
	
	app.post('/editShell',function(req,res){
		var command = req.body.command;
		var shellName = req.body.shellName;
		if(undefined == command){
			res.send(JSON.stringify({code:-1,msg:'need require paramter!'}));
			res.end();
			return;
		}
		if(undefined == shellName){
			res.send(JSON.stringify({code:-1,msg:'need require paramter!'}));
			res.end();
			return;
		}
		var filePath = req.body.filePath;
		if(!filePath.endWith('/')){
			filePath=filePath+'/';
		}
		core.editShell(command,filePath+shellName,res);
	})

	/*app.post('/file-upload', function(req, res) {
		var tmp_path = req.files.filedata.path;
		var target_path = './upload/' + req.files.filedata.name;
		fileUtil.upload(tmp_path, target_path, res, req);
	});*/

	/**
	 * 测试连接
	 */
	app.post('/monitor', function(req, res) {
		//console.log('date=' + req.body.date);
		//console.log('ipAddr=' + req.body.ipAddr);
		res.send('ok');
		res.end();
	});

	/**
	 * 编辑定时执行监控命令
	 */
	app.post('/cmd-cfg', function(req, res) {
		var id = req.body.id;
		var cmd = req.body.cmd;
		var optype = req.body.optype;
		var desc = req.body.desc;
		var minute = req.body.minute;
		console.log("ID:" + id + " CMD:" + cmd + " OPTYPE:" + optype + " DESC:"
				+ desc + " MINUTE:" + minute);
		if(minute<=0){
			var obj = {code:-1,msg:'Parameter [ minute ] mast greater than zero!'};
			res.send(JSON.stringify(obj));
			res.end();
			return ;
		}
		core.editCmdCfg(app, res, id, cmd, optype, desc, minute);
	});

	/**
	 * 停止监控命令运行
	 */
	app.get('/stop-cmd/:cmdId', function(req, res) {
		core.stopCmdByID(app, req.params.cmdId, res);
	});
	app.get('/stop-net/:netId', function(req, res) {
		core.stopNetByID(app, req.params.netId, res);
	});

	/**
	 * 根据监控ID启动定时执行器
	 */
	app.get('/start-cmd/:cmdId', function(req, res) {
		core.startCmdByID(app, req.params.cmdId, res);
	});
	app.get('/start-net/:netId', function(req, res) {
		core.startNetByID(app, req.params.netId, res);
	});

	/**
	 * 停止所有的定时器
	 */
	app.get('/stop-all-cmd', function(req, res) {
		core.stopAllCmd(app, res, true);
	});
	app.get('/stop-all-net', function(req, res) {
		core.stopAllNet(app, res, true);
	});

	/**
	 * 启动所有的定时器
	 */
	app.get('/start-all-cmd', function(req, res) {
		core.startAllCmd(app, res);
	});
	app.get('/start-all-net', function(req, res) {
		core.startAllNet(app, res);
	});
	
	/**
	 * 获取所有定时器状态
	 */
	app.get('/get-cmd-timer-list', function(req, res) {
		core.listTimerStatus(app, res);
	});
	app.get('/get-net-timer-list', function(req, res) {
		core.listNetTimerStatus(app, res);
	});

	/**
	 * 网络监控命令配置
	 */
	app.post('/net-cfg', function(req, res) {
		var id = req.body.id;
		var ipAddr = req.body.ipAddr;
		var port = req.body.port;
		var reqtype = req.body.reqtype;
		var optype = req.body.optype;
		var desc = req.body.desc;
		var minute = req.body.minute;
		console.log("ID:" + id + " IP:" + ipAddr + " port:" + port
				+ " reqtype:" + reqtype + " OPTYPE:" + optype + " DESC:" + desc
				+ " MINUTE:" + minute);
		if(minute<=0){
			var obj = {code:-1,msg:'Parameter [ minute ] mast greater than zero!'};
			res.send(JSON.stringify(obj));
			res.end();
			return ;
		}
		core.editNetCfg(app, res, id, ipAddr, port, reqtype, optype, desc,minute);
	});
	
	/**
	 * 手动运行网络检查
	 */
	app.get('/run-net-check-id/:netId',function(req, res){
		core.runNetCheckByID(app,res,req.params.netId);
	});
	
	/**
	 * 手动运行网络检查
	 */
	app.post('/run-net-check-ip/:ipAddr/:port',function(req, res){
		if(undefined == req.body.ipAddr){
			res.send(JSON.stringify({code:-1,msg:'need require paramter!'}));
			res.end();
			return;
		}
		if(undefined == req.body.port){
			res.send(JSON.stringify({code:-1,msg:'need require paramter!'}));
			res.end();
			return;
		}
		if(undefined == req.body.reqtype){
			res.send(JSON.stringify({code:-1,msg:'need require paramter!'}));
			res.end();
			return;
		}
		core.runNetCheckByIpAddr(app,res,req.body.ipAddr,req.body.port,req.body.reqtype,req.body.desc);
	});
	
	/**
	 * 作业重处理
	 */
	app.post('/redoJob',function(req, res){
		var command = req.body.command;
		var eventId = req.body.eventId;
		var isRunBack = req.body.isRunBack;
		if(undefined == isRunBack){//undefined
			isRunBack = 'true'
		}
		core.rodoJob(command,eventId,res,isRunBack);
	});

	app.post('/exportTable',function(req, res){
		var distCd = req.body.distCd;
		var sourceTb = req.body.sourceTb;
		var targetTb = req.body.targetTb;
		console.log(distCd+" "+sourceTb+" "+targetTb);		
		res.send(JSON.stringify({code:'0',msg:'success!'}));
		res.end();
		transfert.exportData(distCd,sourceTb,targetTb);		
	});

	app.post('/checkExportDone',function(req, res){
		var distCd = req.body.distCd;
                var sourceTb = req.body.sourceTb;
                var targetTb = req.body.targetTb;
                console.log(distCd+" "+sourceTb+" "+targetTb);
                transfert.checkExportDone(res,distCd,sourceTb,targetTb);	
	});


	app.post('/cleanExportTable',function(req,res){
		var distCd = req.body.distCd;
                var sourceTb = req.body.sourceTb;
                var targetTb = req.body.targetTb;
                console.log(distCd+" "+sourceTb+" "+targetTb);
		res.send(JSON.stringify({code:'0',msg:'success!'}));
		res.end();
		transfert.cleanExportTable(distCd,sourceTb,targetTb);
	});

	app.post('/checkCleanDone',function(req,res){
		var distCd = req.body.distCd;
                var sourceTb = req.body.sourceTb;
                var targetTb = req.body.targetTb;
                console.log(distCd+" "+sourceTb+" "+targetTb);
		transfert.checkCleanDone(res,distCd,sourceTb,targetTb);	
	});
};
