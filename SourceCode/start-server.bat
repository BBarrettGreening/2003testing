@echo off
echo Starting Show Scraper Server...
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

:: Change to the directory where your server.js file is located
cd /d %~dp0src

:: Run the Node.js server
node server.js

:: Pause to keep the window open if there's an error
pause