const fs = require('fs');
const path = require('path');

const logFile = path.join(process.cwd(), 'outfit-generation-debug.log');

function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n\n`;
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write to debug log:', error);
  }
}

function clearLog() {
  try {
    fs.writeFileSync(logFile, '=== OUTFIT GENERATION DEBUG LOG ===\n\n');
  } catch (error) {
    console.error('Failed to clear debug log:', error);
  }
}

module.exports = { debugLog, clearLog };