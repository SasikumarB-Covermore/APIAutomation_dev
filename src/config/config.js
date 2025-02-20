export const baseURL = 'https://Test3-api.travelinsurancepartners.com/v1';
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-API-KEY': ''
};
export const validStatusCode = [200, 201, 202, 204];
export const emailAddress = "suraj.amin@covermore.com";
export const OUTPUT_DIR_PATH = 'src/output';
export const PARTNER_NAME = "cm-direct";
export const getDataFilePath = (partnerName = PARTNER_NAME) => {

  return `src/data/${partnerName}/API_DATA.xlsx`;

};
export let configVeriskVersion = 3.0
