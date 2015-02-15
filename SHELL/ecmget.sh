#!/bin/bash
source ~/.bash_profile

if [ $# != 1 ]; then
  echo "Usage: [<args>]"
  echo "Commands:"
  echo "  tableName       "
  echo "  threads         "
  echo "  distCd         "
  echo "  ipAddr         "
  exit 1
fi

tmp=`echo $1|awk -F '##' '{print $NF}'`
echo $tmp


tableName=`echo $tmp|cut -d '-' -f 2`
#threads=$2
threads=200
distCd=`echo $tmp|cut -d '-' -f 1`
ipAddr=`echo $tmp|cut -d '-' -f 4`
targetTb=`echo $tmp|cut -d '-' -f 3`

echo $distCd $tableName $targetTb $ipAddr

downFilePath='/app/data1/transfert/data/'$distCd
revFlg=1
mkdir $downFilePath/$tableName -p
checkAndDown(){
  if [ -f $downFilePath/$tableName/"part-m-"$i ]; then
  	echo "$downFilePath/$tableName/"part-m-"$i down finished..."
	return 0
  fi
  if [ -f $downFilePath/$tableName/"part-m-"$i.mg! ];then
  #if [ 1 == 1 ];then
	echo "delete error file "$downFilePath/$tableName/"part-m-"$i.mg!
	rm $downFilePath/$tableName/"part-m-"$i.mg!
	echo "start to download file [$downFilePath/$tableName/part-m-$i]"
  fi
	mytget -n $threads http://$ipAddr/$tableName/part-m-$i -d $downFilePath/$tableName 

  return 1
#  if [ -f $downFilePath/$tableName/"part-m-"$i.mg! ]; then
#	echo "delete error file "$downFilePath/$tableName/"part-m-"$i.mg!	
#	echo "return 1"
#	return 1
#  elif [ -f $downFilePath/$tableName/"part-m-"$i ]; then
#	echo "return 0"
#	return 0
#  fi
#  return 1
}


for i in {0..199}
do
  i=`printf %05d $i`
  revFlg=1
  while [ $revFlg == 1 ]
  do
	checkAndDown
	revFlg=$?
  done
done

echo "the tableFile [$tableName] download is complete ... "

echo "starting put [$tableName] to HDFS..."
hdfs dfs -put $downFilePath/$tableName /bakdata/$distCd/
echo "HDFS put [$tableName] complete...[$?]"

exit $?
