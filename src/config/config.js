export const baseURL = 'https://Test3-api.travelinsurancepartners.com/v1';
export const defaultHeaders = {
  'X-API-Key':'AtomMBApiKey',
  'X-Timestamp':'2025-01-22T15:42:53.688Z',
  'X-Signature':'gt+7boxUC9SlrBy9w2QOthyObwE=',
  'Content-Type': 'application/json',
  'X-Correlation-Id': 'TestGetQuoteCorrelationId'
};
export const validStatusCode = [200, 201, 202, 204];
export const emailAddress = "sasikumar.b@covermore.com";
export const OUTPUT_DIR_PATH = 'src/output';
export const PARTNER_NAME = "cm-direct";
export const getDataFilePath = (partnerName=PARTNER_NAME) => {

  return `src/data/${partnerName}/API_DATA.xlsx`;
  
};
export let configVeriskVersion = 3.0
