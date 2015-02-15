#!/bin/bash
distCd=$1
tablename=$2
tTableName=$3

if [ $# != 3 ]; then
  echo "Usage: [<args>]"
  echo "Commands:"
  echo "  distCd         "
  echo "  sourcetable    "
  echo "  targettable    "
  exit 1
fi


exprotPath="/ht"
localPath="/app/data6/ht"
date_echo(){
  echo `date +%Y-%m-%d" "%H:%M:%S`" "$*
}

cleanJob(){
  rm -rf $localPath/$distCd"_"$tablename"_"$tTableName".err"
  hdfs dfs -rmr $exprotPath/$tablename
  rm -rf $localPath/$tablename 
}
date_echo "lock table [$tablename]..."
cleanJob
date_echo "begin to export table [$tablename] from HBase to HDFS..."
hbase org.apache.hadoop.hbase.mapreduce.Export $tablename $exprotPath/$tablename
flg=$?

list(){
#echo $localPath/$tablename
tmpLst=`ls $localPath/$tablename -l|grep part|awk '{print $NF}'` 
echo $tmpLst > $localPath/$distCd"_"$tablename"_"$tTableName 
}

copyToLocal(){
  date_echo "begin to download file..."
  hdfs dfs -get $exprotPath/$tablename $localPath/$tablename 
  flg=$?
  if [ $flg == 0 ];then
	date_echo "the table [$tablename] copy to local complete!!!"	
	touch $localPath/$distCd"_"$tablename"_"$tTableName
	#list
	nohup $localPath/genMd5.sh $localPath $tablename $distCd > /dev/null 2>&1 &
        exit 0
  else
       date_echo "the table [$tablename] copy to local error!"
       touch $localPath/$distCd"_"$tablename"_"$tTableName".err"
       exit -1
  fi
}

if [ $flg == 0 ];then
  date_echo "export talbe [$tablename] complete!"
  copyToLocal  
else
  date_echo "export table [$tablename] error!"
  touch $localPath/$distCd"_"$tablename"_"$tTableName".err"
  exit -1
fi
