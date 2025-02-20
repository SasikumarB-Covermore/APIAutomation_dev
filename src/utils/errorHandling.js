const path = require('path');
const fs = require("fs");
const moment = require('moment-timezone');

// Create the directory at the start of the test suite
let sharedRunDir = null;

async function enhancedTestStep(test, stepTitle, stepFn, testDetails, testName, scenario) {
    await test.step(stepTitle, async () => {
      try {
        await stepFn();
      } catch (error) {
        const cleanedError = cleanAndFormatErrorMessage(error.message);
        testDetails.scenarios.push({
          scenario,
          error: cleanedError,
        });
        testDetails.hasError = true; // Set an error flag in testDetails
        console.error(`Error in ${scenario}: ${cleanedError}`);
        throw error; // Re-throw to ensure the test fails
      }
    });
  }


  function saveTestDetails(testDetails, testName, runDir) {
    if (!runDir || !fs.existsSync(runDir)) {
        console.error("Run directory not set or does not exist. Cannot save test details.");
        return;
      }
  
    // The directory should already exist if we are using the same runDir for the whole suite
    const fileName = `failed_test_${testName}_${Date.now()}.json`;
    const filePath = path.join(runDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(testDetails, null, 2));
    console.error(`Test details saved to ${filePath}`);
  }
  
  
  // Directory to store the JSON folders
  const baseOutputDir = path.join(__dirname, "../failed_test_results");
  
  function createRunDirectory() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const runDir = path.join(baseOutputDir, `run_${timestamp}`);
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    return runDir;
  }



function manageFolderCount(maxFolders = 2) {
    if (!fs.existsSync(baseOutputDir)) return;
  
    console.log('manage folders is being called');
  
    const folders = fs.readdirSync(baseOutputDir)
      .map(name => ({
        name,
        time: fs.statSync(path.join(baseOutputDir, name)).ctime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by creation time descending
  
    while (folders.length > maxFolders) {
      const oldest = folders.pop();
      const oldestDirPath = path.join(baseOutputDir, oldest.name);
      try {
       // fs.rmdirSync(oldestDirPath, { recursive: true });
        fs.rmSync(oldestDirPath, { recursive: true, force: true }); // Updated to use fs.rmSync
  
        console.log(`Deleted old test result folder: ${oldestDirPath}`);
      } catch (error) {
        console.error(`Failed to delete folder: ${oldestDirPath}. Error: ${error.message}`);
      }
    }
    }

function cleanAndFormatErrorMessage(errorMessage) {
    // Remove ANSI escape codes using a regular expression
    let cleanedMessage = errorMessage.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nq-uy=><]/g, '');
  
    // Remove newline characters
  //  cleanedMessage = cleanedMessage.replace(/\\n/g, ' ');
    cleanedMessage = cleanedMessage.replace(/\n/g, ' ');
  
    // Replace other specific patterns if needed
   // cleanedMessage = cleanedMessage.replace('Received: undefined', 'Received an undefined value when a defined value was expected.');
  
    // Trim any extra whitespace
    cleanedMessage = cleanedMessage.trim();
  
    return cleanedMessage;
  }

 // Store the shared directory in a file for workers

function getOrCreateRunDir() {
    
  if (sharedRunDir) {
 //   console.log(`Test suite directory initialized at getOrCreateRunDir: ${sharedRunDir}`)
    // Return the shared directory if it already exists
    return sharedRunDir;
  }

  // Otherwise, create a new directory and assign it to sharedRunDir
 // const runDir = createUniqueRunDir();
  sharedRunDir = createUniqueRunDir();
//  console.log(`Unique directory created from getOrCreateRunDir: ${sharedRunDir}`);
  return sharedRunDir;
}

  function clearRunDirFile() {
    if (sharedRunDir && fs.existsSync(sharedRunDir)) {
      fs.rmSync(sharedRunDir, { recursive: true, force: true });
      console.log(`Cleared previous run directory: ${sharedRunDir}`);
    }
  }
  
  // Create a unique directory for each test suite execution

  function createUniqueRunDir() {
    const timestamp = moment().tz('Australia/Sydney').format('YYYY-MM-DD_HH-mm-ss');
    const runDir = path.join(baseOutputDir, `run_${timestamp}`);
    fs.mkdirSync(runDir, { recursive: true });
  //  console.log(`Unique directory created from createUniqueRunDir: ${runDir}`);
    return runDir;
}

  module.exports = { 
    enhancedTestStep,
    saveTestDetails,
    createRunDirectory,
    manageFolderCount,
    cleanAndFormatErrorMessage,
    clearRunDirFile,
    createUniqueRunDir,
    getOrCreateRunDir
  };