#!/bin/bash
# used only on testing and vagrant
cd "$(dirname "$0")/.."

PID_FILE="./bin/test_server_pid.txt"
if [[ -f $PID_FILE ]]
then
	PID=`cat $PID_FILE`
	rm "$PID_FILE"
	kill -SIGINT $PID
	sleep 1
	if [[ `ps $PID|wc -l` -eq "2" ]]
	then
		kill -SIGTERM $PID
		echo "Server expectations not met"
		exit 1
	else
		echo "Server expectations met"
	fi
fi
