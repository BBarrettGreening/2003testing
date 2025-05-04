#!/bin/bash
echo "Starting Show Scraper Server..."
echo ""
echo "Press Ctrl+C to stop the server when you're done."
echo ""

# Change to the directory where your server.js file is located
cd "$(dirname "$0")/src"

# Run the Node.js server
node server.jss