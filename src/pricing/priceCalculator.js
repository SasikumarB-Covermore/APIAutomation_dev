const XLSX = require('xlsx');
const {
  calculateCANXPrice,
  calculateCFAR
} = require('./calculations/CANXPrice');
const {
  calculatePriceByValue,
  calculatePriceByAgeband,
  calculateCRSPrice,
  calculateEMCPrice
} = require('./calculations/sharedFunctions');

export class PriceCalculator {
  constructor(row, payload) {
    this.productCode = row.productCode
    this.planName = row.planName
    this.row = row
    this.requestPayload = payload
    this.simpleFileWorkbook = this.getWorkbook()
    this.emcValue = row.emc;
  }

  getSimpleFilePath() {
    return `src/pricing/simpleFiles/${this.productCode}/${this.planName}.xlsx`
  }

  readWorkbook(filePath) {
    return XLSX.readFile(filePath)
  }

  getWorkbook() {
    const filePath = this.getSimpleFilePath()
    return this.readWorkbook(filePath)
  }

  getCalculationData(traveller) {
    const items = {
      area: this.row.area,
      excess: Number(this.row.excess),
      tripDuration: this.row.duration,
      age: traveller.age
    }

    return items;
  }

  calculatePrice(enableAddOnPriceCalculation = true) {
    const calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["travellers"] = [];
    this.requestPayload['travellers'].forEach(traveller => {
      calculatedPrices["travellers"][traveller.identifier] = this.calculateBasePrice(traveller);
      if (this.emcValue !== undefined && traveller.identifier == 'adult1') {
        const calcData = this.getCalculationData(traveller);
        let emcprice = calculateEMCPrice(this.simpleFileWorkbook, calcData, { code: this.emcValue });
        if (emcprice !== undefined) {
          calculatedPrices["travellers"][traveller.identifier]["emcPrice"] = emcprice.price;
        }
      }
      if (enableAddOnPriceCalculation) {
        calculatedPrices["travellers"][traveller.identifier]['additionalCoversPrice'] = [];
        console.log("## Travaler detail " + JSON.stringify(traveller));
        traveller.additionalCovers.forEach(cover => {
          coverPrice = this.calculateCoverPrice(cover, traveller);
          if (coverPrice !== undefined) {
            calculatedPrices["travellers"][traveller.identifier][
              'additionalCoversPrice'
            ].push(coverPrice);
          }
        });
        console.log(
          `Additional covers price of ${traveller.identifier}:`,
          calculatedPrices["travellers"][traveller.identifier]['additionalCoversPrice']
        );
      }
    });
    if (enableAddOnPriceCalculation) {
      let coverPrice = this.calculatePolicyLevelCoverPrice();
      if (coverPrice !== undefined) {
        calculatedPrices.additionalCoverPrices = coverPrice;
      }
      console.log(`Additional covers price:`, calculatedPrices.additionalCoverPrices);
    }
    return calculatedPrices;
  }

  calculateBasePrice(traveller) {
    let expetcedPrice = this.calculatePriceForAgeBand({ code: 'Base' }, traveller);
    if (expetcedPrice !== undefined) {
      let basePrice = expetcedPrice.price;
      console.log(
        `[${this.productCode} ${this.planName} excess: ${this.row.excess}, duration: ${this.row.duration}, area: ${this.row.area}] Gross Price for ${traveller.identifier} of ${traveller.age} is :`,
        basePrice.gross
      );
      return {
        age: traveller.age,
        price: {
          gross: basePrice.gross,
          displayPrice: basePrice.displayPrice,
          isDiscount: false
        }
      }
    } else {
      throw new Error(
        `The Base selling price for the ${this.productCode} ${this.planName} has not been found`
      )
    }
  }

  calculatePolicyLevelCoverPrice() {
    let additionalCovers = this.requestPayload?.additionalCovers;
    if (additionalCovers) {
      let additionalCoverPrices = [];
      additionalCovers.forEach(cover => {
        let priceObj = this.calculateCoverPrice(cover);
        if (priceObj !== undefined) {
          additionalCoverPrices.push(priceObj);
        }
      });
      return additionalCoverPrices;
    }
  }

  calculateCoverPrice(cover, traveller = '') {
    const additionalCoverageCodes = ['LUGG', 'ADVACT', 'MTCLTWO', 'RTCR'];

    if (additionalCoverageCodes.includes(cover.code)) {
      return calculatePriceByValue(this.simpleFileWorkbook, cover);
    }

    switch (cover.code) {
      case 'CANX':
        return calculateCANXPrice(
          this.simpleFileWorkbook,
          this.requestPayload,
          this.row
        )
      case 'SNSPRTS':
      case 'SNSPRTS2':
      case 'ADVACT3':
      case 'SNSPRTS3':
      case 'CRS2':
      case 'AGECBA':
      case 'ADVACT2':
        return this.calculatePriceForAgeBand(cover, traveller);
      case 'CRS':
        const calcData = this.getCalculationData(traveller);
        return calculateCRSPrice(this.simpleFileWorkbook, calcData, cover);
      case 'CANXPC':
        return calculateCFAR(
          this.simpleFileWorkbook,
          this.requestPayload,
          this.row
        );
      default:
        console.log(
          'No price calculation available for this add-on',
          cover.code
        );
        return undefined; // Explicitly return undefined for unmatched cases
    }
  }

  calculatePriceForAgeBand(cover, traveller) {
    const calcData = this.getCalculationData(traveller);
    return calculatePriceByAgeband(this.simpleFileWorkbook, calcData, cover);
  }
}
