#!/bin/bash
# used only on testing and vagrant
cd "$(dirname "$0")/.."

PID_FILE="./bin/test_server_pid.txt"

if [ $# -ne 3 ]
then
    echo "$0 PROTOCOL HOST PORT"
    exit
else
    PROTOCOL=$1
    HOST=$2
    PORT=$3
fi

if [[ `netstat -an|grep $PORT|grep LISTEN|wc -l` -eq '0' ]]; then
	node ./server/token-authentication.js $PORT &
	echo $! > "$PID_FILE"

	echo 'Server started'
else
	echo 'Port is already taken'
	exit 1
fi
