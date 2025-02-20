import { readFile, utils } from 'xlsx';
import { writeFileSync } from 'fs';

/**
 * Converts an Excel file to JSON.
 * @param {string} filePath - The path to the Excel file.
 * @param {string} [sheetName] - The name of the sheet to convert. If not provided, the first sheet will be used.
 * @param {string} [outputPath] - The path where the JSON file will be saved. If not provided, JSON data will be returned.
 * @returns {Promise<void|string>} - Returns a promise that resolves to the JSON data if outputPath is not provided.
 */


async function excelToJson(filePath, sheetName = null, outputPath = null) {
    // Read the Excel file
    //../test-automation-framework/src/data/API_Template.xlsx
    const workbook = readFile(filePath);

    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found.`);
    }

    // Convert the sheet to JSON
    let jsonData = utils.sheet_to_json(sheet); // Use header: 1 for raw data including header row
    if (outputPath) {
        // Save JSON to file
        writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
        console.log(`Excel data converted to JSON and saved to ${outputPath}`);
    } else {
        // Return JSON data
        return jsonData;
    }
}

function filterRowsByExecution(data) {
    return data.filter(row => {
      if (typeof row.Execute !== 'string') {
        console.warn(`Warning: Invalid or missing Execute value in row:`, row);
        return false;
      }
      return row.Execute.toLowerCase() === "yes";
    });
  }


export default { excelToJson,filterRowsByExecution };