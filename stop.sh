#!/bin/bash

ps -ef|grep app.js |grep -v grep|awk {'print $2'}|xargs kill -9

