/*
  Requiring necessary helpers.
*/
var Appbase = require('appbase-js');
var helper = require("./helper.js");

/*
  Including appbase credentials stored in json file.
*/
var appbase_credentials = require('./appbase_credentials.json');

/*
  Appbase Credentials. Just make new account at appbase and configure it according to your account.
  Creating object of appbase, passing appbase_credentials.
*/
var appbaseRef = new Appbase(appbase_credentials);

var productList = []
  /*
    This function is for starting polling of all the productsand storing it into the appbase databse.
    The time interval of polling is set to 1000 seconds.
  */
function startPolling() {
  function poll() {
    setTimeout(function() {
      for (productId in productList) {
        console.log("Starting polling for the product with Id: " + productList[productId]);
        helper.indexProduct(productId);
      }
      poll();
    }, 1000000);
  };
  poll();
}

/*
  Main function responsible for listing of products for whch polling is to be started.
*/
function fetchProducts() {
  var requestObject = {
    type: appbase_credentials.type,
    body: {
      query: {
        match_all: {}
      }
    }
  };
  appbaseRef.search(requestObject).on('data', function(response) {
    productList = response.hits.hits.map(function(hit) {
      return hit._id;
    });
    startPolling();
    appbaseRef.searchStream(requestObject).on('data', function(stream) {
      console.log("Starting polling for new product streamed: " + stream._id);
      productList.push(stream._id);
    }).on('error', function(error) {
      console.log("searchStream() failed with: ", error);
    });
  }).on('error', function(error) {
    console.log("search() failed with: ", error)
  });
}

/*
  Call to the starter function.
*/
fetchProducts();
