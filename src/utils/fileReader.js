
import { readFileSync, writeFileSync,unlink } from 'fs';

function savePolicyNumber(policyNumbers,filename){
    const directoryPath = path.join(__dirname, '../output'); // Specify your directory path
    const filePath = path.join(directoryPath, filename);
    if (isEmptyArray(policyNumbers)){
      console.log('There is no policy number to save in the file');
    }else{
      const dataToWrite = policyNumbers.join(',');
  
      // Write data to the file
      writeFileSync(filePath, dataToWrite, (err) => {
        if (err) {
          console.error('Error writing to file:', err);
        } else {
          console.log('File created and data written successfully!');
        }
      })
    }
  }
  
  function loadFile(filePath) {
      try {
        const data = readFileSync(filePath, 'utf8');
        return (data != '') ? data.split(',') : []; // Assuming each line is an element in the array
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist
            return [];
        } else {
            // Other error (e.g., permission denied)
            throw error;
        }
    }
  }
  
  async function deleteDataFile(filePath) {
    try {
      await unlink(filePath, err => {
        if (err.code === 'ENOENT') {
          // File does not exist
          return
        }
        console.log(`File ${filePath} has been successfully removed.`)
      })
    } catch (error) {
        throw error
    }
  }
  
  function isEmptyArray(arr) {
    return Array.isArray(arr) && arr.length === 0;
  }

  module.exports = { savePolicyNumber,
    loadFile,isEmptyArray,deleteDataFile
   };