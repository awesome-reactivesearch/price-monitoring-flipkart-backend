var Appbase = require('appbase-js');
/*
    This is function which just gives details about products and call callback along with the details.
*/
module.exports.get_product_details = function(product_id,callback){
  var request = require('request');
  var options = {
  uri:'https://affiliate-api.flipkart.net/affiliate/product/json?id='+product_id,
  method: 'GET',  
  headers: require('./flipkart_credentials.json')
  };
  var data;
  request(options, function (error, response, body) {
    if (!error && response != undefined && response.statusCode == 200) {
        data = JSON.parse(body);
    } else {
        console.log("Got an error: ", error, ", status code: ", response);
    }
  }).on('complete',function(){
    if(data != undefined)
      callback(data);
  });
}

/*
  Function for indexing the product detail into appbase databse.
*/
module.exports.index_product = function(product_id, isUpdated){
  this.get_product_details(product_id,function(data){
    var price = data.productBaseInfo.productAttributes.sellingPrice.amount;
    var appbaseRef = new Appbase(require('./appbase_credentials.json'));
    if(isUpdated){
      appbaseRef.update({
        type: 'flipkart_app',
        id: product_id,
        body: {
          doc: {
            'price': price,
            'product_id': product_id
          }
        }
      }).on('data', function(response) {
        console.log(response);
      }).on('error', function(error) {
        console.log(error);
      });
    } else {
      appbaseRef.index({
        type: 'flipkart_app',
        id: product_id,
        body: {
          'price': price,
          'product_id': product_id
        }
      }).on('data', function(response) {
        console.log(response);
      }).on('error', function(error) {
        console.log(error);
      });
    }
  });
}