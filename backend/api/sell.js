const express = require('express');
const router = express.Router();
const jwt = require('./jwt');
const db = require('../db');
const { requireLogin } = require("./auth.js");
const socketAPI = require("../realtime/socket-broadcaster");

const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');                   // node only; native TextEncoder/Decoder

router.use(express.json());

/*
 * Sell a spot on the blockchain, adds keys to database
 * so that a purchase can be instant, makes sure key is
 * valid before pushing changes
 */
router.post('/', requireLogin, (req,res) => {
    // if(jwt.verifyJWT(req.body.token, req.body.pid)) {

    if(req.body.pid && req.body.key && req.body.spot.spot_id && req.body.spot.zone_id && req.body.spot.start_time && req.body.spot.end_time && req.body.spot.price) {
        let keys = [req.body.key];
        const signatureProvider = new JsSignatureProvider(keys);
        const rpc = new JsonRpc('http://127.0.0.1:8888', { fetch });

        //Make sure the key is valid and your key
        let {PrivateKey, PublicKey, Signature, Aes, key_utils, config} = require('eosjs-ecc');
        let pubkey = PrivateKey.fromString(keys[0]).toPublic().toString();
        rpc.history_get_key_accounts(pubkey).then(result => {
            if(result.account_names.includes(req.body.pid.toLowerCase())) {
                let isValidReq = true;

                //Checking to see that you own all of the spots queried 
                db.query("SELECT * FROM parking_times WHERE spot_id = $1 AND zone_id = $2 AND time_code BETWEEN $3 AND $4",
                    [req.body.spot.spot_id, req.body.spot.zone_id, req.body.spot.start_time, req.body.spot.end_time-1])
                .then(dbres => {
                    for(i in dbres.rows) {
                        if(dbres.rows[i].user_pid != req.body.pid) {
                            isValidReq = false;
                        }
                    }
                    if(isValidReq) {
                        //Update the spots to being sold in the database
                        db.query("UPDATE parking_times SET price = $5, availability = true, seller_key = $6  WHERE spot_id = $1 AND zone_id = $2 AND time_code BETWEEN $3 AND $4 RETURNING *",
                        [req.body.spot.spot_id, req.body.spot.zone_id, req.body.spot.start_time, req.body.spot.end_time-1, req.body.spot.price, req.body.key], (err, response) => {
                            if(err) {
                                console.log(err);
                                res.status(500).json({message: "Internal Server Error"});
                            }
                            else {
                                res.status(200).json({message: "Success", rows: response.rows});

                                // Getting the socket.
                                const socket = req.app.settings["socket-api"];
                                
                                // Calculating the total price for the sold sold.
                                const indexOfLastRow = response.rows.length - 1;
                                const totalPrice = response.rows.reduce((acc, curr) => {
                                    return acc + Number(curr.price);
                                }, 0);

                                // Formatting the information that is to be sent to the zones page
                                // to be displayed for sale.
                                const zonePageData = {
                                    isAvail: true,
                                    parkingInfo: {
                                        start_time: Number(response.rows[0].time_code),
                                        end_time: Number(response.rows[indexOfLastRow].time) + (15 * 60 * 1000) - 1,
                                        zone_id: Number(response.rows[0].zone_id),
                                        spot_id: Number(response.rows[0].spot_id),
                                        price: totalPrice
                                    }
                                }

                                // Sending the info to the specified namespace and event name.
                                socketAPI.broadcastZoneInfo(
                                    socket,
                                    req.body.spot.zone_id,
                                    zonePageData
                                );
                            }
                        });
                    }
                    else {
                        res.status(410).json({message: "Don't own all spots trying to sell"});
                    }
                }).catch(err => {
                    console.log(err);
                })
            }
        }).catch(err => {
            console.log(err);
            res.status(400).json({message: "Bad Key"});
        });
    }
    else {
        res.status(400).json({message: "Bad json format"});
    }
    // } else {
    //     res.status(401).json({message: "Bad login"});
    // }
});

module.exports = router;
