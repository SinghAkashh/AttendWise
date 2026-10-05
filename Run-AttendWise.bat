@echo off
title AttendWise Development Server
echo ==============================================
echo       Starting AttendWise Server...
echo ==============================================
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000
npm run dev
pause
