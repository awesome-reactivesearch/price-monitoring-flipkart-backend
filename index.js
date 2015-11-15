var express = require('express');
var request = require('request');
var fs = require('fs');
var app = express();
var Appbase = require('appbase-js');

/*
  Appbase Credentials. Just make new account at appbase and configure it according to your account.
*/
var poll_counter = 0;

var appbase_credentials = {
  url: 'https://scalr.api.appbase.io',
  appname: 'testgsoc',
  username: 'JxGrCcfHZ',
  password: '1c46a541-98fa-404c-ad61-d41571a82e14'
};

/*
  Initialize user and pass with any correct credentials in order to send mail.
*/
var credentials = {
  auth: {
    api_user: 'yashshah',
    api_key: 'appbase12'
  }
}

/* This is to access any file withn folder, no routing required for these files. */
app.use('/', express.static(__dirname + '/'));

function get_product_details(product_id,callback){
  var options = {
  uri:'https://affiliate-api.flipkart.net/affiliate/product/json?id='+product_id,
  method: 'GET',  
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Fk-Affiliate-Id':'puneet241',
    'Fk-Affiliate-Token':'731d132580ba45d8ac0ee5fb8bec9fa1'
    }
  };
  var data;
  request(options, function (error, response, body) {
    if (!error && response != undefined && response.statusCode == 200) {
        data = JSON.parse(body);
        console.log(data);
    } else {
        console.log("Got an error: ", error, ", status code: ", response);
    }
  }).on('complete',function(){
    callback(data);
  });
}

function start_polling(product_id)
{
  console.log('polling counter :- '+poll_counter);
  poll_counter += 1;
  function poll() {
    setTimeout(function() {
      get_product_details(product_id,function(data){
        var price = data.productBaseInfo.productAttributes.sellingPrice.amount;
        var app_base = new Appbase(appbase_credentials);
        app_base.index({
          type: 'flipkart_app',
          id: product_id,
          body: { 'price': price, 'product_id': product_id }
        }).on('data', function(response) {
          console.log(response);
        }).on('error', function(error) {
          console.log(error);
        });
      });
      poll();
    }, 10000);
  };
  poll(); 
}

app.get('/get_product_details', function (req, res) {
  console.log('request arrived');
  console.log(req.param('product_id'));
  get_product_details(req.param('product_id'),function(data){
      var details = {
        'product_id' : req.param('product_id'),
        'price' : data.productBaseInfo.productAttributes.sellingPrice.amount,
        'details' : data.productBaseInfo.productAttributes.productBrand,
        'imageurls' : data.productBaseInfo.productAttributes.imageUrls
      }
      console.log(details);
      res.send(details);
  });
});

/* Price alert routing. The Client side makes the ajax call to this route with 
   params [product_id,email,price]. This route has 2 tasks, first one is to start 
   polling of this product in order to save the updated price of product into appbase
   database and another is start the search for the condition mentioned by the user 
   and send the mail as soon as the condition is matched. 
*/
app.get('/alerting', function (req, res) {
  /* Starting polling for the requested product */
  console.log("alerting called");
  console.log(req.param('product_id'));
  start_polling(req.param('product_id'));
  /* Starting stream search for the user condition */
  var app_base = new Appbase(appbase_credentials);
  app_base.searchStream({
      type: 'flipkart_app',
      body: {
        "query": { 
          "bool": { 
            "must": [
              { "match": { "product_id": req.param('product_id')  }}, 
              { "match": { "price": req.param('lte') }}  
            ]
          }
        }
      }
  }).on('data', function(response) {
      console.log("new document update: ", response);
      html = "<p>You have set the price alert for flipkart product <b>"+req.param('product_id')+"</b>. Your condition has been matched and Price has reached to "+req.param('lte')+"</p>";
      var options = {
      'method': 'POST',
      'uri': 'https:\\\\api.sendgrid.com\\api\\mail.send.json',
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      'body': 'to='+req.param('email')+'&amp;toname=Yash&amp;subject=Flipkart Price Alert&amp;html='+html+'&amp;text=Price reached to '+req.param('lte')+'&amp;from=Appbase.io&amp;api_user=yashshah&amp;api_key=appbase12'
      };
      request(options, function (error, response, body) {if(error){console.log(error);}});
      console.log('mail sent to :- '+req.param('email'));
      this.stop();
  }).on('error', function(error) {
      console.log("getStream() failed with: ", error)
  })
});

/* It will start the server. */
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Flipkart extension back-end app listening at http://%s:%s', host, port);
});
