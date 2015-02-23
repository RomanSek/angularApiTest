#!/bin/bash
# Copyright (C) 2015 by Clearcode <http://clearcode.cc>
# and associates (see AUTHORS).
#
# This file is part of [angularApiTest].
#
# [angularApiTest] is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# [angularApiTest] is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with [angularApiTest].  If not, see <http://www.gnu.org/licenses/>.
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
