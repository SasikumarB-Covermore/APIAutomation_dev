import { emptyDir } from 'fs-extra';

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
  constructor(row, payload, response, addons) {
    this.productCode = row.productCode
    this.planName = row.planName
    this.row = row
    this.requestPayload = payload
    this.simpleFileWorkbook = this.getWorkbook()
    this.emcValue = row.EMC;
    this.response = response;
    this.addons = addons;
  }

  getSimpleFilePath() {
    return `src/pricing/simpleFiles/${this.productCode}/${this.planName}.xlsx`
  }

  getSimpleFilePathForGetQuote(product) {
    return `src/pricing/simpleFiles/${product.productCode}/${product.name}.xlsx`
  }

  readWorkbook(filePath) {
    return XLSX.readFile(filePath)
  }

  getWorkbook() {
    const filePath = this.getSimpleFilePath();
    return this.readWorkbook(filePath);
  }

  getWorkbookForGetQuote(product) {
    const filePath = this.getSimpleFilePathForGetQuote(product);
    return this.readWorkbook(filePath);
  }

  getCalculationData(travellers, text) {
    const items = {
      area: this.row.area,
      excess: Number(this.row.excess),
      tripDuration: this.row.duration,
      age: travellers.age
    }
    return items;
  }

  getCalculationDataForGetQuote(travellers, text, product) {
    const items = {
      area: this.row.area,
      excess: Number(product.excess),
      tripDuration: product.duration,
      age: travellers.age
    }
    return items;
  }


  calculatePrice(enableAddOnPriceCalculation = true) {
    var calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["travellers"] = [];
    this.requestPayload.travellers.forEach((traveller, index) => {
      calculatedPrices["travellers"][index] = this.calculateBasePrice(traveller);
      if (this.emcValue !== undefined && this.emcValue != 0 && traveller.isPrimary == "true" && this.addons == "OnlyEMC") {
        const calcData = this.getCalculationData(traveller, "EMC");
        let emcprice = calculateEMCPrice(this.simpleFileWorkbook, calcData, { code: this.emcValue });
        calculatedPrices["travellers"][index]["emcPrice"] = [];
        if (emcprice !== undefined) {
          let calEMCPrice = emcprice.price
          calculatedPrices["travellers"][index]["emcPrice"].push(calEMCPrice);
        }
      }
      if (enableAddOnPriceCalculation) {
        if (Array.isArray(traveller.additionalCoverAddons)) {
          traveller.additionalCoverAddons.forEach((additionalCoverAddon, coverIndex) => {
            calculatedPrices["travellers"][index]['additionalCoverAddons'] = [];
            coverPrice = this.calculateCoverPrice(additionalCoverAddon, traveller);
            if (coverPrice !== undefined) {
              calculatedPrices["travellers"][index]['additionalCoverAddons'].push(coverPrice);
            }

          });
        }

      }
    });
    if (enableAddOnPriceCalculation) {
      let coverPrice = this.calculatePolicyLevelCoverPrice();
      if (coverPrice !== undefined) {
        calculatedPrices.additionalCoverAddons = coverPrice;
      }
    }

    return calculatedPrices;
  }

  calculatePriceForGetQuote(enableAddOnPriceCalculation = true) {
    let products = {};
    products = [];
    this.response.quoteSummary.products.forEach((product, index) => {
      product.premiumMatrix.forEach((matrix, matrixIndex) => {
        if (matrix.isSelected == true) {
          products[index] = {
            excess: matrix.excess,
            duration: matrix.maxDurationDays === '' || matrix.maxDurationDays == null ? this.row.duration : matrix.maxDurationDays,
            productCode: product.productCode,
            name: product.name,
            additionalCoverAddons: {
              code: "CANX",
              options: {
                value: product.destinationType === "Domestic" ? 5271 : 30818,
                description: product.destinationType === "Domestic" ? "$10000" : "$Unlimited"
              }
            }
          }
        }

      });

    });

    var calculatedPrices = {};
    let coverPrice = {};
    calculatedPrices["product"] = [];
    products.forEach((product, coverIndex) => {
      calculatedPrices["product"].push(this.calculateBasePriceForGetQuoteProduct(product));
      calculatedPrices["product"][coverIndex]["travellers"] = [];
      this.requestPayload.travellers.forEach((traveller, index) => {
        calculatedPrices["product"][coverIndex]["travellers"].push(this.calculateBasePriceForGetQuote(traveller, product));
        calculatedPrices["product"][coverIndex]["travellers"][index]['additionalCoverAddons'] = [];
        coverPrice = this.calculateCoverPriceForGetQuote(product, traveller);
        if (coverPrice !== undefined) {
          calculatedPrices["product"][coverIndex]["travellers"][index]['additionalCoverAddons'].push(coverPrice);
        }
      });
    });
    return calculatedPrices;
  }

  calculateBasePriceForGetQuoteProduct(product) {

    return {
      excess: product.excess,
      duration: product.duration,
      productCode: product.productCode,
      name: product.name
    }
  }

  calculateBasePriceForGetQuote(travellers, product) {
    let expetcedPrice;

    expetcedPrice = this.calculatePriceForAgeBandForGetQuote({ code: 'Base' }, travellers, product);

    if (expetcedPrice !== undefined) {
      let basePrice = expetcedPrice.price;
      let result = {
        age: travellers.age,
        price: {
          gross: basePrice.gross,
          displayPrice: basePrice.displayPrice,
          isDiscount: false
        }
      }
      return result;
    } else {
      throw new Error(
        `The Base selling price for the ${this.productCode} ${this.planName} has not been found`
      )
    }
  }

  calculateBasePrice(travellers) {
    let expetcedPrice;

    expetcedPrice = this.calculatePriceForAgeBand({ code: 'Base' }, travellers);

    if (expetcedPrice !== undefined) {
      let basePrice = expetcedPrice.price;
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
  }

  //new fuction 16/04/2024 for policy cover addons
  calculatePolicyLevelCoverPrice() {
    let additionalCovers = this.requestPayload.products[0].additionalCoverAddons;

    let additionalCoverPrices = [];
    additionalCovers.forEach(cover => {
      if (cover.code == "CRS") {
        this.requestPayload.travellers.forEach((traveller, index) => {
          let priceObj = this.calculateCoverPrice(cover, traveller);
          if (priceObj !== undefined) {
            additionalCoverPrices.push(priceObj);
          }
        });

      } else if (cover.code == "WNTS") {
        this.requestPayload.travellers.forEach((traveller, index) => {
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
      case 'CRS':
        const calcDataCRS = this.getCalculationData(travellers, "CRS");
        return calculateCRSPrice(this.simpleFileWorkbook, calcDataCRS, cover);
      case 'WNTS':
        const calcDataWNTS = this.getCalculationData(travellers, "WNTS");
        return calculateWNTSPrice(this.simpleFileWorkbook, calcDataWNTS, cover);
      default:
        console.log(
          'No price calculation available for this add-on',
          cover.code
        );
        return undefined; // Explicitly return undefined for unmatched cases
    }
  }

  calculateCoverPriceForGetQuote(product, travellers = '') {
    console.log("Travaler detail for get quote canx " + JSON.stringify(travellers));
    const additionalCoverageCodes = ['LUGG', 'MTCL'];
    if (additionalCoverageCodes.includes(product.additionalCoverAddons.code)) {
      return calculatePriceByValue(this.simpleFileWorkbook, cover);
    }

    switch (product.additionalCoverAddons.code) {
      case 'CANX':
        return calculateCANXPriceForGetQuote(
          this.getWorkbookForGetQuote(product),
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

  calculatePriceForAgeBandForGetQuote(cover, travellers, product) {
    const calcData = this.getCalculationDataForGetQuote(travellers, "AgeBand", product);
    return calculatePriceByAgeband(this.getWorkbookForGetQuote(product), calcData, cover);
  }

  calculatePriceForAgeBand(cover, travellers) {
    const calcData = this.getCalculationData(travellers, "AgeBand");
    return calculatePriceByAgeband(this.simpleFileWorkbook, calcData, cover);
  }
}
