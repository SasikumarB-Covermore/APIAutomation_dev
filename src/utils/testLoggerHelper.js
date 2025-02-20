const { performance } = require('perf_hooks');
const mixpanel = require('mixpanel');
const os = require('os');
const https = require('https');
const axios = require('axios');

// Initialize Mixpanel client
const mixpanelClient = mixpanel.init('da29b048abcd9fefca467330be001db1', { geolocate: false });

// Custom HTTPS agent to ignore SSL certificate errors
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class TestLoggerHelper {
  constructor() {
    this.startTime = null;
  }

  // Start the timer at the beginning of a test
  startTimer() {
    this.startTime = performance.now();
  }

  // Calculate the test duration in seconds
  calculateDuration() {
    if (!this.startTime) {
      throw new Error('Timer was not started.');
    }
    const duration = (performance.now() - this.startTime) / 1000;  // Convert to seconds
    return duration;
  }

  // Function to get the local IP address
  getLocalIPAddress() {
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = '';

    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      for (const address of addresses) {
        if (address.family === 'IPv4' && !address.internal) {
          ipAddress = address.address;
          break;
        }
      }
    }

    return ipAddress;
  }

  // Function to log test details to Mixpanel
  /*
  async logTestDetailsToMixpanel(testName, testStatus, testFileName, duration, ipAddress) {
    return new Promise((resolve, reject) => {
      mixpanelClient.track('Test Run', {
        distinct_id: testFileName,
        testName: testName,
        status: testStatus,
        duration: duration,
        timestamp: new Date().toISOString(),
        ip: ipAddress
      }, (err) => {
        if (err) {
          console.error('Error logging to Mixpanel:', err);
          reject(err);
        } else {
          console.log('Test details logged to Mixpanel!');
          resolve();
        }
      });
    });
  }
*/

logTestDetailsToMixpanel(testName, testStatus, testFileName, duration, ipAddress) {
  return new Promise((resolve, reject) => {
    // Construct payload for Mixpanel
    const payload = {
      event: 'Test Run',
      properties: {
        distinct_id: testFileName,
        testName: testName,
        status: testStatus,
        duration: duration,
        timestamp: new Date().toISOString(),
        ip: ipAddress,
        token: 'da29b048abcd9fefca467330be001db1'  // Include token in payload
      }
    };

    // Mixpanel requires the payload to be base64 encoded and sent as `data`
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    axios.post('https://api.mixpanel.com/track', `data=${base64Payload}`, {
      httpsAgent: httpsAgent,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then((response) => {
      if (response.status === 200) {
        console.log('Mixpanel response:', response.data);
        console.log('Test details successfully logged to Mixpanel!');
        resolve();  // Resolve the promise on success
        
      } else {
        console.error('Unexpected response from Mixpanel:', response.data);
        reject(new Error('Unexpected response from Mixpanel'));
      }
    })
    .catch((err) => {
      console.error('Error logging to Mixpanel:', err);
      reject(err);
    });
  });
}

  // Log the test details using local IP and calculated duration
  async logTestDetails(testName, testStatus, testFileName, duration) {
    const ipAddress = this.getLocalIPAddress();  // Fetch the IP address
    await this.logTestDetailsToMixpanel(testName, testStatus, testFileName, duration, ipAddress);
  }
}

module.exports = TestLoggerHelper;
