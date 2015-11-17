/*
  Requiring necessary helpers.
*/
var Appbase = require('appbase-js');
var helper = require("./helper.js");

/*
  Hash Map of products for maintaining list of product_ids for which polling has started.
*/
var polled_products=[];

/*
  Including appbase credentials stored in json file.
*/
var appbase_credentials = require('./appbase_credentials.json');

/*
  Appbase Credentials. Just make new account at appbase and configure it according to your account.
  Creating object of appbase, passing appbase_credentials.
*/
var appbase = new Appbase(appbase_credentials);

/*
  This function is for starting polling of received produt_id and storing it into the appbase databse.
  The time interval of polling is set to 10 seconds.
*/
function start_polling(product_id)
{
  function poll() {
    setTimeout(function() {
      helper.product_indexing(product_id);
      poll();
    }, 10000);
  };
  poll(); 
}

/*
  Main function responsible for listing of products for whch polling is to be started.
*/
function starter(){
  polled_products[" _streamsearch"] = true;
  var app_base = new Appbase(appbase_credentials);
  console.log('.....polling of Products.....');
  app_base.search({
    type: 'flipkart_app',
    body: {
      query: {
        match_all: {}
      }
    }
  }).on('data', function(response) {
    var arr = response.hits.hits;
    for(obj in arr){
      if(polled_products[arr[obj]._id] == undefined){
        console.log("Starting polling for "+arr[obj]._id);
        polled_products[arr[obj]._id] = true
        start_polling(arr[obj]._id);
      }
    }
  }).on('error', function(error) {
      console.log("getStream() failed with: ", error)
  });

  /*
    This function is to start polling, If any new product item is added into appbase database.
  */
  app_base.searchStream({
    type: "flipkart_app",
    body: {
      query: {
        match_all: {}
      }
    }
  }).on('data', function(res) {
    if(polled_products[res._id] == undefined){
      console.log("polling of new object arrived "+res._id);
      polled_products[res._id] = true;
      start_polling(res._id);
    }
  }).on('error', function(err) {
    console.log("streaming error: ", err);
  });

}

/*
  Call to the starter function.
*/
starter();