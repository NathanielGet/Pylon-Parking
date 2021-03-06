const express = require("express");
const router = express.Router();
const jwt = require('./jwt');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const { requireLogin } = require("./auth.js");
var multer  = require('multer')
var upload = multer({ dest: '../public/data/uploads/' })
const db = require("../db");
const conf = require("./config.js");

router.use(express.json());

const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

/*
  Endpoint for sending the image to be processed for a license plate.
  Uses a 3rd party machine learning api to read the license plate.
*/
router.post("/", upload.single('image'), function (req, res) {
  if (req.body.image) {
    // Formatting the image.
    let body = new FormData();
    body.append('upload', req.body.image);

    body.append('regions', 'us'); // Change to your country
    fetch("https://api.platerecognizer.com/v1/plate-reader/", {
        method: 'POST',
        headers: {
            "Authorization": "Token dd2e85cdffcb75b447a8cdbb1207565b46ca7b66"
        },
        body: body
    }).then(res => res.json())
    .then(json => {
      console.log(json)
      // Sending response back to the front end.
      res.status(200).json({ ...json });
    })
    .catch((err) => {
      console.log(err);
      // 406 is Not Acceptable.
      res.status(406).json({ message: 'Image is bad.' })
    });
  }
});

/*
  Endpoint for submitting a report.
*/
router.post("/report", requireLogin, (req, res) => {
  console.log(req.body);
  //This would be a query to VT's lisence plate registration, checks to see if registered liscence plate matches with pid of spot at that time
  //For now we just use the EXAMPLE value
  let current_time = Math.floor(Date.now()/1000);
  db.query("SELECT user_PID FROM parking_times WHERE spot_id = $1 AND zone_id = $2 AND time_code BETWEEN $3 AND $4",
           [req.body.spot_id, req.body.zone_id, current_time-899, current_time])
    .then(dbres => {
      console.log(dbres.rows[0].user_pid);
      //This would be a query to VT's lisence plate registration, checks to see if registered liscence plate matches with pid of spot at that time
      //For now we just use the EXAMPLE value
      let database_plate = 'EXAMPLE';
      if(req.body.license_info != database_plate) {
        const signatureProvider = new JsSignatureProvider([conf.adminKey]);
        const rpc = new JsonRpc('http://127.0.0.1:8888', { fetch });
        const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        api.transact({
          actions: [{
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{
              actor: 'admin',
              permission: 'active'
            }],
            data: {
              from: 'admin',
              to: req.body.pid.toLowerCase(),
              quantity: '300.0000 VTP',
              memo: 'Initial Tokens'
            }
          }]
        },
        {
          blocksBehind: 3,
          expireSeconds: 30,
        })
        .then(blockres => {
          console.log(blockres);
          res.status(200).json({message: "Congratulations! Bounty Accepted, Added 300 VTP To Your Account. Keep Up The Good Work! P.S. Mind Sharing The Wealth?"});
        })
        .catch(err => {
          console.log(err);
          res.status(400).json({message: "Internal Server Error"});
        })
      }
      else {
        res.status(200).json({message: "Plate registered for current time"});
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({message: "Internal Server Error"});
    })
  /*
    - req.body.pid
    - req.body.zone_id = zone id for the reported spot.
    - req.body.spot_id = spot id for the reported spot.
    - req.body.license_info = license plate info of the car parked here.
  */
});

module.exports = router;
