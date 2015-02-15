#!/bin/bash

localPath=$1
tableName=$2
distCd=$3

if [ $# != 3 ]; then
  echo "Usage: [<args>]"
  echo "Commands:"
  echo "  localPath	 "
  echo "  tableName	 "
  echo "  distCd	 "
  exit 1
fi

date_echo(){
  echo `date +%Y-%m-%d" "%H:%M:%S`" "$*
}

rm -rf $localPath/$distCd"_"$tableName".md5"

for f in `ls $localPath/$tableName`
do
 if [ $f != "_SUCCESS" ]; then
   ret=`md5sum $localPath/$tableName/$f`
   md5Code=`echo $ret|awk -F ' ' '{print $1}'`
   fileName=`echo $ret|awk -F ' ' '{print $2}'|awk -F '/' '{print $NF}'`
   echo $md5Code" "$fileName >> $localPath/$distCd"_"$tableName".md5"
 fi
done

exit 0
