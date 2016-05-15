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
var appbaseCredentials = require('./appbase_credentials.json');
var sendgrid_api_key = "ENTER_YOUR_SENDGRID_API_KEY_HERE"


/*
  Appbase Credentials. Just make new account at appbase and configure it according to your account.
  Creating object of appbase, passing appbaseCredentials.
*/
var appbase = new Appbase(appbaseCredentials);

/* This is to access any file withn folder, no routing required for these files. */
app.use('/', express.static(__dirname + '/'));

/* This route is for returning product details of particular product. */
app.get('/product', function(req, res) {
  helper.getProductDetails(req.param('productId'), function(data) {
    var details = {
      'productId': req.param('productId'),
      'price': data.productBaseInfoV1.flipkartSpecialPrice.amount,
      'name': data.productBaseInfoV1.title,
      'imageurls': data.productBaseInfoV1.imageUrls
    }
    res.send(details);
  });
});

/* Price alert routing. The Client side makes the ajax call to this route with 
   params [productId,email,price]. This route has 2 tasks, first one is to start 
   polling of this product in order to save the updated price of product into appbase
   database and another is start the search for the condition mentioned by the user 
   and send the mail as soon as the condition is matched. 
*/
app.get('/alert', function(req, res) {
  /* Starting polling for the requested product */
  var mailBody = "You have set the price alert for flipkart product {{{name}}}. Your condition has been matched and Price has reached to {{{price}}}";

  var requestObject = {
    type: appbaseCredentials.type,
    body: {
      "query": {
        "filtered": {
          "query": {
            "match": { "productId": req.param('productId') }
          },
          "filter": {
            "range": {
              "price": {
                "lt": req.param('lte'),
                "gte": req.param('gte')
              }
            }
          }
        }
      }
    }
  }

  var webhookObject = {
    'method': 'POST',
    'url': 'https://api.sendgrid.com/api/mail.send.json',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ' + sendgrid_api_key
    },
    "count": 1,
    'string_body': 'to=' + req.param('email') + '&amp;subject=Your Flipkart product price Alert&amp;text=' + mailBody + '&amp;from=yash@appbase.io'
  }
  /* Starting stream search for the user condition */
  appbase.searchStreamToURL(requestObject, webhookObject).on('data', function(response) {
    console.log("Webhook has been configured : ", response);
  }).on('error', function(error) {
    console.log("searchStreamToURL() failed with: ", error)
  })
  helper.indexProduct(req.param('productId'));
});

/* It will start the server. */
var server = app.listen(process.env.PORT || 8081, '0.0.0.0', function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Flipkart extension back-end app listening at http://%s:%s', host, port);
});
