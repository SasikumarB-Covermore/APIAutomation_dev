import { getDataFilePath } from '../config/config';
import { expect } from '@playwright/test';
const filePath = getDataFilePath();
const sheetName = 'HelpText';
const { excelToJson } = require('./excelUtils').default;

export class HelpTextValidator {

  constructor (responseBody) {
    this.actualBenefits = responseBody.benefits;
  }

  async fetchBenefitsList () {
    try {
      const data = await excelToJson(filePath, sheetName);
      const list = {};

      data.forEach(r => {
        const benefitName = r.benefitName.trim();
        const helpText = this.normalizeString(r.helpText);

        if (!benefitName || !helpText) {
          throw new Error(`Invalid data for benefit: ${JSON.stringify(r)}`);
        }

        list[benefitName] = helpText;
      })

      return list;
    } catch (error) {
      console.error('Error fetching benefits list:', error);
      throw new Error(
        'Failed to fetch benefits list. Please check the file and sheet name.'
      )
    }
  }

  async validateHelpText () {
    try {
      const expectedBenefits = await this.fetchBenefitsList();
      if (Object.keys(expectedBenefits).length == 0) {
        // throw new Error(
        //   'No Data has been found in the help text sheet.'
        // )
        console.log('Helptext sheet is empty hence Helptext and Benefit is not validated');
      } else {
      this.actualBenefits.forEach(benefit => {
        const name = benefit.name.trim();
        const expectedHelpText = expectedBenefits[name];
        const actualHelpText = this.normalizeString(benefit.helpText);

        this.checkHelpTextMatch(name, expectedHelpText, actualHelpText);
      });
    }
    } catch (error) {
      console.error('Error validating help text:', error);
      // Optionally, rethrow or handle the error further
      throw error;
    }
  }

  checkHelpTextMatch (name, expected, actual) {
    const message = `The help text for ${name} has been successfully matched with the API response.`;
    if (expected === undefined) {
      throw new Error(`No expected help text found for ${name}.`);
    }
    expect(expected === actual, message).toBeTruthy();
    
  }

  normalizeString(str){
    return str.replace(/\r?\n|\r/g, '').trim();
  }
}
