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
    const filePath = this.getSimpleFilePath();
    //console.log("file path " + filePath);
    return this.readWorkbook(filePath);
  }

  getCalculationData(traveller) {
    const items = {
      area: this.row.area,
      excess: Number(this.row.excess),
      tripDuration: this.row.duration,
      age: traveller.age
    }
    //console.log("items details " + JSON.stringify(items));
    return items;
  }

  calculatePrice(enableAddOnPriceCalculation = true) {
    var calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["travellers"] = [];
    console.log("request payload from tes " + JSON.stringify(this.requestPayload));
    this.requestPayload.traveller.forEach((traveller, index) => {

      console.log("checking loop count " + index);
      calculatedPrices["travellers"][index] = this.calculateBasePrice(traveller);
      //console.log("Checking calculated price " + JSON.stringify(calculatedPrices));
      if (this.emcValue !== undefined && traveller.treatAsAdult == true) {
        console.log("thiss scenario have emc");
        const calcData = this.getCalculationData(traveller);
        let emcprice = calculateEMCPrice(this.simpleFileWorkbook, calcData, { code: this.emcValue });
        if (emcprice !== undefined) {
          calculatedPrices["travellers"][traveller.identifier]["emcPrice"] = emcprice.price;
        }
      }
      if (enableAddOnPriceCalculation) {
        console.log("thiss scenario have Travaler addons");

        //console.log("## Travaler detail " + JSON.stringify(traveller));
        //console.log("## cover detail " + JSON.stringify(cover));
        traveller.additionalCoverAddons.forEach(index => {
          calculatedPrices["travellers"][index]['additionalCoverAddons'] = [];
          //console.log("index check " + JSON.stringify(index));
          coverPrice = this.calculateCoverPrice(index, traveller);
          //console.log("cover addons price " + JSON.stringify(coverPrice));
          if (coverPrice !== undefined) {
            calculatedPrices["travellers"][index]['additionalCoverAddons'].push({ coverPrice });
          }

          console.log(
            `Additional covers price of ${index}:`,
            calculatedPrices["travellers"][index]['additionalCoverAddons']
          );
        });

      }
    });
    if (enableAddOnPriceCalculation) {
      console.log("thiss scenario have Policy addons");
      let coverPrice = this.calculatePolicyLevelCoverPrice();
      //console.log("Policy level add on from calcualte policy level cover price " + JSON.stringify(coverPrice));
      if (coverPrice !== undefined) {
        calculatedPrices.additionalCoverAddons = coverPrice;
      }
      console.log(`Additional covers price:`, calculatedPrices.additionalCoverAddons);
    }

    console.log("price calculate price " + JSON.stringify(calculatedPrices));
    return calculatedPrices;
  }

  calculateBasePrice(traveller) {
    let expetcedPrice = this.calculatePriceForAgeBand({ code: 'Base' }, traveller);
    if (expetcedPrice !== undefined) {
      let basePrice = expetcedPrice.price;
      console.log(
        `[${this.productCode} ${this.planName} excess: ${this.row.excess}, duration: ${this.row.duration}, area: ${this.row.area}] Gross Price for Age: ${traveller.age} is :`,
        basePrice.gross
      );
      console.log("calculated base price details, travaler asge " + traveller.age + " base price " + basePrice.gross + "display price " + basePrice.displayPrice);
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
    let additionalCovers = this.requestPayload.products[0].additionalCoverAddons;
    console.log("Policy level addon on calcualte policy level cover price " + JSON.stringify(additionalCovers));
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
    const additionalCoverageCodes = ['LUGG', 'CANX', 'MTCL', 'WNTS', 'EMCT3', 'EMCT5', 'EMCT6', 'EMCT7', 'EMCT8', 'EMCT9', 'EMCT10'];
    console.log("cover code " + cover.code);
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
      // case 'MTCL':
      //   return calculateCANXPrice(
      //     this.simpleFileWorkbook,
      //     this.requestPayload,
      //     this.row
      //   )
      // case 'WNTS':
      //   return calculateCANXPrice(
      //     this.simpleFileWorkbook,
      //     this.requestPayload,
      //     this.row
      //   )
      case 'LUGG':
      // case 'SNSPRTS3':
      // case 'CRS2':
      // case 'AGECBA':
      // case 'ADVACT2':
      //   return this.calculatePriceForAgeBand(cover, traveller);
      // case 'CRS':
      //   const calcData = this.getCalculationData(traveller);
      //   return calculateCRSPrice(this.simpleFileWorkbook, calcData, cover);
      // case 'CANXPC':
      //   return calculateCFAR(
      //     this.simpleFileWorkbook,
      //     this.requestPayload,
      //     this.row
      //   );
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
    //console.log("sample file detail " + JSON.stringify(this.simpleFileWorkbook));
    return calculatePriceByAgeband(this.simpleFileWorkbook, calcData, cover);
  }
}
