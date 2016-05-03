/*
  Requiring necessary helpers.
*/
var express = require('express');
var request = require('request');
var fs = require('fs');
var app = express();
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
var appbase = new Appbase(appbase_credentials);

/* This is to access any file withn folder, no routing required for these files. */
app.use('/', express.static(__dirname + '/'));

/* This route is for returning product details of particular product. */
app.get('/product', function(req, res) {
  helper.get_product_details(req.param('product_id'), function(data) {
    var details = {
      'product_id': req.param('product_id'),
      'price': data.productBaseInfo.productAttributes.sellingPrice.amount,
      'name': data.productBaseInfo.productAttributes.productBrand,
      'imageurls': data.productBaseInfo.productAttributes.imageUrls
    }
    res.send(details);
  });
});

/* Price alert routing. The Client side makes the ajax call to this route with 
   params [product_id,email,price]. This route has 2 tasks, first one is to start 
   polling of this product in order to save the updated price of product into appbase
   database and another is start the search for the condition mentioned by the user 
   and send the mail as soon as the condition is matched. 
*/
app.get('/alert', function(req, res) {
  /* Starting polling for the requested product */
  var sendgrid_api_key = "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"
  var mail_body = "You have set the price alert for flipkart product {{{name}}}. Your condition has been matched and Price has reached to {{{price}}}";
  /* Starting stream search for the user condition */
  appbase.searchStreamToURL({
    type: appbase_credentials.type,
    body: {
      "query": {
        "filtered": {
          "query": {
            "match": { "product_id": req.param('product_id') }
          },
          "filter": {
            "range": {
              "price": {
                "lte": req.param('lte'),
                "gte": req.param('gte')
              }
            }
          }
        }
      }
    }
  }, {
    'method': 'POST',
    'url': 'https://api.sendgrid.com/api/mail.send.json',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + sendgrid_api_key
    },
    "count": 1,
    'string_body': 'to=' + req.param('email') + '&amp;subject=Your Flipkart product price Alert&amp;text=' + mail_body + '&amp;from=yash@appbase.io'
  }).on('data', function(response) {
    console.log("Webhook has been configured : ", response);
  }).on('error', function(error) {
    console.log("searchStreamToURL() failed with: ", error)
  })
  helper.index_product(req.param('product_id'));
});

/* It will start the server. */
var server = app.listen(process.env.PORT || 3000, '0.0.0.0', function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Flipkart extension back-end app listening at http://%s:%s', host, port);
});
