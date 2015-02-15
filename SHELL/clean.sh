#!/bin/bash

if [ $# != 3 ]; then
  echo "Usage: [<args>]"
  echo "Commands:"
  echo "  distCd         "
  exit 1
fi

distCd=$1
tablename=$2
tTableName=$3
localPath="/app/data6/ht"

date_echo(){
  echo `date +%Y-%m-%d" "%H:%M:%S`" "$*
}
echo $distCd $tablename $tTableName $localPath
date_echo "start to clean Hdfs file [$tablename]... "
hdfs dfs -rmr /ht/$tablename

if [ $? != 0 ];then
  date_echo "hdfs dfs -rmr [/ht/$tablename] error!"
  date_echo "clean job error!"
  exit -1
fi
date_echo "clean hdfs file [$tablename] success!"
date_echo "start to clean localFile [$tablename]... "
rm -rf $localPath/$tablename 
if [ $? = 0 ];then
  date_echo "rm localFile [$tablename] success!"
  exit 0
else 
  date_echo "clean job error!"
  exit -1
fi
