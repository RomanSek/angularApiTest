#!/bin/bash
# used only on testing and vagrant
cd "$(dirname "$0")/.."

PID_FILE="./bin/test_server_pid.txt"
if [[ -f $PID_FILE ]]; then
	kill `cat "$PID_FILE"`
	rm "$PID_FILE"
fi
