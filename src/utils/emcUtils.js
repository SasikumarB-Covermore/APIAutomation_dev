const xlsx = require('xlsx');

function getEMCScore(emcValue, filePath) {
  // Load the workbook
  const workbook = xlsx.readFile(filePath);

  // Select the EMCs worksheet
  const emcSheet = workbook.Sheets['EmcTier'];
  const emcSheetData = xlsx.utils.sheet_to_json(emcSheet);

  // Find the row in the 'EMC' sheet that matches the EMC value
  const matchingRow = emcSheetData.find(emcRow => emcRow['Tier'] === emcValue); // Replace 'FirstColumn' with the name of the first column in EMC sheet

  if (matchingRow) {
    // Capture the value from the score column
    const emcScore = matchingRow['Value']; // Replace 'SecondColumn' with the actual name of the next column in EMC sheet

    console.log(`For EMC value: ${emcValue}, Found Corresponding Value: ${emcScore}`);
    return emcScore; // Return the value for use in the test
  } else {
    console.log(`No matching value found for EMC: ${emcValue}`);
    return null; // Return null if no matching row is found
  }
}

function generateEmcConditions() {
  return [
    {
      score: 2.38,
      id: 2219,
      name: 'Coronary artery bypass graft',
      isOkForMultiTrip: true,
      isOkForWinterSports: true,
      assessment: [
        {
          question: 'Have you ever been a smoker?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        },
        {
          question: 'How long ago was your most recent procedure?',
          answers: [
            {
              answer: 'More than six weeks ago',
              selected: true
            }
          ]
        },
        {
          question: 'At any time BEFORE your most recent heart procedure, did you suffer a heart attack?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        },
        {
          question: 'Have you EVER had any symptoms of angina (eg chest pain, chest tightness) since your last procedure?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        },
        {
          question: 'Have you had a heart attack at any time AFTER your most recent heart procedure?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        },
        {
          question: 'Can you always walk 200 metres on the flat without becoming short of breath?',
          answers: [
            {
              answer: 'Yes',
              selected: true
            }
          ]
        },
        {
          question: 'Have you been advised to take medication for high blood pressure?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        },
        {
          question: 'Have you been advised to take medication to lower your cholesterol?',
          answers: [
            {
              answer: 'Yes',
              selected: true
            }
          ]
        }
      ]
    },
    {
      score: 1.3,
      id: 1330,
      name: 'Cholesterol levels',
      isOkForMultiTrip: true,
      isOkForWinterSports: true,
      assessment: [
        {
          question: 'Has a blood test EVER at any time shown your cholesterol level to be raised?',
          answers: [
            {
              answer: 'Yes',
              selected: true
            }
          ]
        },
        {
          question: 'Have you been advised to take medication for high blood pressure?',
          answers: [
            {
              answer: 'No',
              selected: true
            }
          ]
        }
      ]
    }
  ];
}

function createSaveEmcPayload(sessionToken, row, tripStartDate, tripEndDate, emcScoreValue){
  return {
    sessionToken: sessionToken,
    SessionInfo: {
        sessionToken: sessionToken,
        alphaCode: row.alphaCode,
        isDeclaredByOther: 'true',
        identifier: 'adult1',
        healixVersion: '3.0',
        healixRegionID: 201,
        Copyrightstatement: 'Some Random text'
    },
       TripInfo: {
         tripStartDate:  tripStartDate,
         tripEndDate: tripEndDate,
        areaCode: 'USA',
        destinations: 'Guam,Canada',
        dateOfBirth: '2000-12-14',
        title: null,
        firstName: 'Test',
        lastName: 'Second'
    },
    AssessmentInfo: {
        ScreeningPath: {
            ScreeningSettings: {
                isAMT: false,
                isWinterSport: 1,
                regionId: 1,
                LinkedCondition: 1,
                IsRiskRatingLite: true
            },
            MedicalRisk: emcScoreValue,
            ScreeningDate: '2023-11-01',
            CustomerJourney: {
                CustomerAction: [
                    {
                        Type: '',
                        ActionDateTime: '',
                        Description: ''
                    }
                ],
                LinkedConditions: [
                    {
                        Name: 'L1',
                        ICD: '',
                        ICD9: '',
                        Type: ''
                    }
                ]
            },
            ScreeningHistory: {
                conditions: [
                    {
                        name: 'High blood pressure',
                        ICD9: '401.9',
                        ICD: 'I10',
                        Category: '',
                        TSF: 'False',
                        RiskRatingLite: 'False',
                        Score: '1.2',
                        ID: 1,
                        GroupId: 1,
                        GroupScore: 2.1,
                        exclusionType: 'None',
                        questions: [
                            {
                                question: 'How many medicines does your doctor advise you to take for high blood pressure?',
                                answer: [
                                    '1'
                                ],
                                negativeAnswer: [
                                    '1'
                                ]
                            },
                            {
                                question: 'Has your dose been increased or have you been prescribed a new tablet in the last 6 months?',
                                answer: [
                                    'Yes'
                                ],
                                negativeAnswer: [
                                    '1'
                                ]
                            }
                        ],
                        LinkedConditions: [
                            {
                                Name: 'L1',
                                ICD: '',
                                ICD9: '',
                                Type: ''
                            }
                        ]
                    }
                ]
            },
            SystemData: {
                ScreeningData: 'asasfsadgfadfgdfhsfghdfghdfgndgndgndgggsgdfg',
                ScreeningType: 'Travel',
                ScreeningHash: '6c82e06f-481a-43ad-aaf5-7fdd8d4f5d49',
                OriginalScreeningHash: '6c82e06f-481a-43ad-aaf5-7fdd8d4f5d49',
                UtcScreeningDateTime: '2023-01-11T12:25:02.418Z',
                BlackBoxModel: 'Internal Data specific to BB3'
            },
            AssessmentType: 'NEW',
            EncrypedResult: 'asdfsdafsadfsadfsadfsdfew2sdfsadf'
        }
    }
}  
}

module.exports = { getEMCScore,generateEmcConditions, createSaveEmcPayload };