/**
 *  * @author hetao
 *   * @see linux monitor agent for psbc ecm
 *    * @Email: he.tao@live.com
 *     * @weibo : http://weibo.com/u/2027119111
 *      * @version ：V0.1
 *       */

/**
 *  * Module dependencies.
 *   */
var fs = require('fs');
var http = require('http');
var exec = require("child_process").exec;
var shellPath="/app/data6/ht";
var core = require('./core');

function exportData(distCd,sourceTb,targetTb){
	var command = shellPath+"/mr.sh "+distCd+" "+sourceTb+" "+targetTb+" > "+shellPath+"/logs/"+distCd+"_export_"+sourceTb+".log 2>&1 ";
	console.log(command);
	exec(command,function(error,stdout,stderr){
                if(error){
			console.log("errror!");
                } else {
			console.log("success!")
                }
        });

}
exports.exportData = exportData;

function checkExportDone(res,distCd,sourceTb,targetTb){
var ipAddr = core.getLocalIpAddress().toString();
	var err_command = "find "+shellPath+"/ -name "+distCd+"_"+sourceTb+"_"+targetTb+".err |wc -l |tr -d '\n'"
        console.log(err_command);
        exec(err_command,function(error,stdout,stderr){
                if(!error){
                        var errcnt  = stdout;
                        if(errcnt==1){
                                res.send(JSON.stringify({code:'-1',msg:'error!'}));
                                res.end();
                        }else{
                                var cmd = "find "+shellPath+"/ -name "+distCd+"_"+sourceTb+"_"+targetTb+" |wc -l |tr -d '\n'"
                                exec(cmd,function(error,stdout,stderr){
                                        if(error){
                                                res.send(JSON.stringify({code:'1',msg:'error'}));
                                                res.end();
                                        }else{
                                                var count = stdout;
                                                if(count==1){
                                                        //res.send(JSON.stringify({code:'0',msg:'success'}));
                                                        res.send(JSON.stringify({code:'0',msg:distCd+"-"+sourceTb+"-"+targetTb+"-"+ipAddr}));
                                                        res.end();
                                                }else{
                                                        res.send(JSON.stringify({code:'1',msg:'running...'}));
                                                        res.end();
                                                }
                                        }
                                });
                        }
                }else{
                        res.send(JSON.stringify({code:'1',msg:'error'}));
                        res.end();
                }
        });
	/*var command = "find "+shellPath+"/ -name "+distCd+"_"+sourceTb+"_"+targetTb+" |wc -l |tr -d '\n'"
	console.log(command);
	exec(command,function(error,stdout,stderr){
		if(error){
			res.send(JSON.stringify({code:'1',msg:'error'}));
                	res.end();	
		}else{
			var count = stdout;
			if(count==1){
				res.send(JSON.stringify({code:'0',msg:'success'}));
                        	res.end();
			}else{
				res.send(JSON.stringify({code:'1',msg:'running...'}));
                                res.end();
			}
		}
	})*/
}
exports.checkExportDone= checkExportDone;

function cleanExportTable(distCd,sourceTb,targetTb){
	console.log(distCd+" "+sourceTb+" "+targetTb);
	var command = shellPath+"/clean.sh "+distCd+" "+sourceTb+" "+targetTb+" > "+shellPath+"/logs/"+distCd+"_clean_"+sourceTb+".log 2>&1 ";
	console.log(command);
	exec(command,function(error,stdout,stderr){
                if(error){
			console.log("errror!");
                } else {
			console.log("success!")
                }
        });
}
exports.cleanExportTable = cleanExportTable;

function checkCleanDone(res,distCd,sourceTb,targetTb){
	var command = "find "+shellPath+"/ -name "+sourceTb+" |wc -l |tr -d '\n'"
	exec(command,function(error,stdout,stderr){
		if(error){
			res.send(JSON.stringify({code:'2',msg:'error'}));
                        res.end();	
		} else {
			var cnt = stdout;	
			if(cnt==0){
				res.send(JSON.stringify({code:'0',msg:'success'}));
                                res.end();		
			} else {
				res.send(JSON.stringify({code:'1',msg:'running...'}));
                                res.end();
			}
		}	
	});

//res.send(JSON.stringify({code:'0',msg:'success'}));
//res.end();
} 
exports.checkCleanDone = checkCleanDone;
