const XLSX = require('xlsx');
const {
  calculateCANXPrice,
  calculateCANXPriceForGetQuote,
  calculateCFAR
} = require('./calculations/CANXPrice');
const {
  calculatePriceByValue,
  calculatePriceByAgeband,
  calculateCRSPrice,
  calculateWNTSPrice,
  calculateEMCPrice
} = require('./calculations/sharedFunctions');

export class PriceCalculator {
  constructor(row, payload, response) {
    this.productCode = row.productCode
    this.planName = row.planName
    this.row = row
    this.requestPayload = payload
    this.simpleFileWorkbook = this.getWorkbook()
    this.emcValue = row.EMC;
    this.response = response;
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

  getCalculationData(travellers, text) {
    //console.log("Check travaler detail for " + text + " && " + JSON.stringify(travellers));
    const items = {
      area: this.row.area,
      excess: Number(this.row.excess),
      tripDuration: this.row.duration,
      age: travellers.age
    }
    //console.log("items details " + JSON.stringify(items));
    return items;
  }

  calculatePrice(enableAddOnPriceCalculation = true) {
    var calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["travellers"] = [];
    //console.log("request payload from tes " + JSON.stringify(this.requestPayload));
    this.requestPayload.travellers.forEach((traveller, index) => {
      calculatedPrices["travellers"][index] = this.calculateBasePrice(traveller);
      // let calPrice = this.calculateBasePrice(traveller);
      // console.log("check indu travellers calPrice " + calPrice);
      // calculatedPrices["travellers"].push({ calPrice });
      //console.log("Checking calculated price " + JSON.stringify(calculatedPrices));
      //console.log("Checking EMC " + JSON.stringify(this.emcValue) + " and Travellers is primary " + traveller.isPrimary);
      if (this.emcValue !== undefined && this.emcValue != 0 && traveller.isPrimary == "true") {
        //console.log("thiss scenario have emc");
        const calcData = this.getCalculationData(traveller, "EMC");
        //console.log("Check calcdata " + JSON.stringify(calcData));
        let emcprice = calculateEMCPrice(this.simpleFileWorkbook, calcData, { code: this.emcValue });
        //console.log("Check EMC cal Price " + JSON.stringify(emcprice));
        calculatedPrices["travellers"][index]["emcPrice"] = [];
        if (emcprice !== undefined) {
          //calculatedPrices["travellers"][travellers]["emcPrice"] = emcprice.price;
          let calEMCPrice = emcprice.price
          calculatedPrices["travellers"][index]["emcPrice"].push(calEMCPrice);
        }
        //console.log("EMC Price " + JSON.stringify(calculatedPrices["travellers"][index]["emcPrice"]));
      }
      if (enableAddOnPriceCalculation) {
        //console.log("thiss scenario have Travaler addons");
        //console.log("## Travaler detail " + JSON.stringify(traveller));
        //console.log("## cover detail " + JSON.stringify(cover));
        //console.log("Check traveller cover add on lenght " + Array.isArray(traveller.additionalCoverAddons));
        if (Array.isArray(traveller.additionalCoverAddons)) {
          traveller.additionalCoverAddons.forEach((additionalCoverAddon, coverIndex) => {
            //console.log("index check " + JSON.stringify(index) + " And Travalser " + JSON.stringify(additionalCoverAddon));
            calculatedPrices["travellers"][index]['additionalCoverAddons'] = [];
            coverPrice = this.calculateCoverPrice(additionalCoverAddon, traveller);
            //console.log("Cover Price Detail " + JSON.stringify(coverPrice));
            if (coverPrice !== undefined) {
              //console.log("cover addons price " + JSON.stringify(coverPrice));
              calculatedPrices["travellers"][index]['additionalCoverAddons'].push(coverPrice);
            }

            //console.log(`Additional covers price of ${index}:`,calculatedPrices["travellers"][coverIndex]['additionalCoverAddons']);
          });
        }

      }
    });
    if (enableAddOnPriceCalculation) {
      //console.log("thiss scenario have Policy addons");
      let coverPrice = this.calculatePolicyLevelCoverPrice();
      //console.log("Policy level add on from calcualte policy level cover price " + JSON.stringify(coverPrice));
      if (coverPrice !== undefined) {
        calculatedPrices.additionalCoverAddons = coverPrice;
      }
      //console.log(`Additional covers price:`, calculatedPrices.additionalCoverAddons);
    }

    //console.log("price calculate price " + JSON.stringify(calculatedPrices));
    return calculatedPrices;
  }

  calculatePriceForGetQuote(enableAddOnPriceCalculation = true) {
    // let products = {};
    // products["products"] = [];
    // products["travellers"];
    // this.response.quoteSummary.products.forEach((product, index) => {
    //   console.log("product " + index);
    //   products["products"][index] = [];
    //   let prodDetails;
    //   product.premiumMatrix.forEach((matrix, matrixIndex) => {
    //     console.log("max duration " + matrix.maxDurationDays);
    //     prodDetails = {
    //       excess: matrix.excess,
    //       duration: matrix.maxDurationDays,
    //       additionalCoverAddons: {
    //         code: "CANX",
    //         options: {
    //           value: product.destinationType === "Domestic" ? 5271 : 30818,
    //           description: product.destinationType === "Domestic" ? "$10000" : "$Unlimited"
    //         }
    //       }
    //     }
    //     products["products"][index].push(prodDetails);
    //   });

    // });

    var calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["travellers"] = [];
    this.response.quoteSummary.travellers.forEach((traveller, index) => {
      calculatedPrices["travellers"][index] = this.calculateBasePrice(traveller);


      this.response.quoteSummary.products.forEach(product => {
        product.availableCoverAddons.forEach((cover, coverIndex) => {
          if (cover.code == "CANX") {
            //calculatedPrices["travellers"][index]['additionalCoverAddons'] = [];
            coverPrice = this.calculateCoverPriceForGetQuote(cover, traveller);
            //console.log("Cover Price Detail " + JSON.stringify(coverPrice));
            // if (coverPrice !== undefined) {
            //   //console.log("cover addons price " + JSON.stringify(coverPrice));
            //   calculatedPrices["travellers"][index]['additionalCoverAddons'].push(coverPrice);
            // }
          }
        });
      });

    });
    //products["travellers"].push(travellers);
    //console.log("calculated Base price for traveller " + JSON.stringify(calculatedPrices));

  }

  calculateBasePrice(travellers) {
    let expetcedPrice;
    //console.log("Traveler detail " + JSON.stringify(travellers));
    //if (travellers.treatAsAdult == "true") {

    expetcedPrice = this.calculatePriceForAgeBand({ code: 'Base' }, travellers);

    if (expetcedPrice !== undefined) {
      let basePrice = expetcedPrice.price;
      //console.log("calculate expected price " + JSON.stringify(basePrice));
      //console.log(`[${this.productCode} ${this.planName} excess: ${this.row.excess}, duration: ${this.row.duration}, area: ${this.row.area}] Gross Price for Age: ${travellers.age} is :`, basePrice.gross);
      //console.log("calculated base price details, travaler age " + travellers.age + " base price " + basePrice.gross + " display price " + basePrice.displayPrice);

      return {
        age: travellers.age,
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
    //}
  }

  // calculatePolicyLevelCoverPrice() {
  //   let additionalCovers = this.requestPayload.products[0].additionalCoverAddons;
  //   //let travellerAge = this.requestPayload.traveller.age;
  //   console.log("Policy level addon on calcualte policy level cover price " + JSON.stringify(additionalCovers));
  //   if (additionalCovers) {
  //     let additionalCoverPrices = [];
  //     additionalCovers.forEach(cover => {
  //       let priceObj = this.calculateCoverPrice(cover);
  //       if (priceObj !== undefined) {
  //         additionalCoverPrices.push(priceObj);
  //       }
  //     });
  //     return additionalCoverPrices;
  //   }
  // }
  //new fuction 16/04/2024 for policy cover addons
  calculatePolicyLevelCoverPrice() {
    let additionalCovers = this.requestPayload.products[0].additionalCoverAddons;
    //let travellerAge = this.requestPayload.traveller.age;
    //console.log("Policy level addon on calcualte policy level cover price " + JSON.stringify(additionalCovers));

    let additionalCoverPrices = [];
    additionalCovers.forEach(cover => {
      //console.log("additional cover code " + JSON.stringify(cover.code));
      if (cover.code == "CRS") {
        //let i = 0;
        this.requestPayload.travellers.forEach((traveller, index) => {
          //travellerAge.push(traveller.age);
          //i = i + 1;
          let priceObj = this.calculateCoverPrice(cover, traveller);
          if (priceObj !== undefined) {
            additionalCoverPrices.push(priceObj);
          }
        });
        //console.log("Traveller Age " + JSON.stringify(travellerAge));
        //console.log("cover " + JSON.stringify(cover));

      } else if (cover.code == "WNTS") {
        this.requestPayload.travellers.forEach((traveller, index) => {
          //travellerAge.push(traveller.age);
          //i = i + 1;
          let priceObj = this.calculateCoverPrice(cover, traveller);
          if (priceObj !== undefined) {
            additionalCoverPrices.push(priceObj);
          }
        });
      } else {
        let priceObj = this.calculateCoverPrice(cover);
        if (priceObj !== undefined) {
          additionalCoverPrices.push(priceObj);
        }
      }
    });
    return additionalCoverPrices;
  }


  calculateCoverPrice(cover, travellers = '') {
    const additionalCoverageCodes = ['LUGG', 'MTCL'];
    //console.log("cover code " + cover.code);
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
      //case 'LUGG':
      // case 'SNSPRTS3':
      // case 'CRS2':
      // case 'AGECBA':
      // case 'ADVACT2':
      //   return this.calculatePriceForAgeBand(cover, travellers);
      case 'CRS':
        const calcDataCRS = this.getCalculationData(travellers, "CRS");
        return calculateCRSPrice(this.simpleFileWorkbook, calcDataCRS, cover);
      case 'WNTS':
        const calcDataWNTS = this.getCalculationData(travellers, "WNTS");
        return calculateWNTSPrice(this.simpleFileWorkbook, calcDataWNTS, cover);
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

  calculateCoverPriceForGetQuote(cover, travellers = '') {
    const additionalCoverageCodes = ['LUGG', 'MTCL'];
    //console.log("cover code " + cover.code);
    if (additionalCoverageCodes.includes(cover.code)) {
      return calculatePriceByValue(this.simpleFileWorkbook, cover);
    }

    switch (cover.code) {
      case 'CANX':
        return calculateCANXPriceForGetQuote(
          this.simpleFileWorkbook,
          this.response,
          this.row
        )

      default:
        console.log(
          'No price calculation available for this add-on',
          cover.code
        );
        return undefined; // Explicitly return undefined for unmatched cases
    }
  }

  calculatePriceForAgeBand(cover, travellers) {
    const calcData = this.getCalculationData(travellers, "AgeBand");
    //console.log("sample file detail " + JSON.stringify(this.simpleFileWorkbook));
    return calculatePriceByAgeband(this.simpleFileWorkbook, calcData, cover);
  }
}
