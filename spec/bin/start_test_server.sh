#!/bin/bash
# used only on testing and vagrant
cd "$(dirname "$0")/.."

PID_FILE="./bin/test_server_pid.txt"
PORT=9000

if [[ `netstat -an|grep $PORT|grep LISTEN|wc -l` -eq '0' ]]; then
	node ./server/token-authentication.js $PORT &
	echo $! > "$PID_FILE"

	echo 'Server started'
else
	echo 'Port is already taken'
	exit 1
fi
