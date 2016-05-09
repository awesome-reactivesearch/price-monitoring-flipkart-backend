var Appbase = require('appbase-js');
var appbaseCredentials = require('./appbase_credentials.json')
  /*
      This is function which just gives details about products and call callback along with the details.
  */
module.exports.getProductDetails = function(productId, callback) {
  var request = require('request');
  var options = {
    uri: 'https://affiliate-api.flipkart.net/affiliate/1.0/product.json?id=' + productId,
    method: 'GET',
    headers: require('./flipkart_credentials.json')
  };
  var data;
  request(options, function(error, response, body) {
    if (!error && response != undefined && response.statusCode == 200) {
      data = JSON.parse(body);
      console.log(data)
    } else {
      console.log("Got an error: ", error, ", status code: ", response);
    }
  }).on('complete', function() {
    if (data != undefined)
      callback(data);
  });
}

/*
  Function for indexing the product detail into appbase databse.
*/
module.exports.indexProduct = function(productId) {
  this.getProductDetails(productId, function(data) {
    var price = data.productBaseInfo.productAttributes.sellingPrice.amount;
    var name = data.productBaseInfo.productAttributes.productBrand
    var appbaseRef = new Appbase(appbaseCredentials);
    appbaseRef.index({
      type: appbaseCredentials.type,
      id: productId,
      body: {
        'price': price,
        'productId': productId,
        'name': name
      }
    }).on('data', function(response) {
      console.log(response);
    }).on('error', function(error) {
      console.log(error);
    });
  });
}
