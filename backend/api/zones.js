const express = require("express");
const router = express.Router();
const db = require("../db");
const socketAPI = require("../realtime/socket-broadcaster");

router.get("/all", (req, res) => {
  db.query("SELECT zone_id, zone_name FROM zones", (err, dbres) => {
    if (err) {
      console.log(err.stack);
      res.status(500).json({ message: "Internal server error" });
    } else {
      // socket call.
      // const socket = req.app.settings["socket-api"];
      // console.log(socket)
      // socket.of('zones').emit('zone-1', 'TEST TEST TEST');
      // socketAPI.broadcastZoneInfo(socket, 1, "testing things out");

      // console.log(dbres.rows);
      res.status(200).json({ zones: dbres.rows });
    }
  });
});

router.get("/:zone_id/spot/:spot_id", (req, res) => {
  if (req.query.startTime && req.query.endTime) {
    db.query(
      "SELECT * FROM parking_times WHERE spot_ID = $1 AND zone_ID = $2 AND time_code >= $3 AND time_code <= $4 AND availability = true",
      [
        req.params.spot_id,
        req.params.zone_id,
        req.query.startTime,
        req.query.endTime
      ],
      (err, dbres) => {
        if (err) {
          console.log(err.stack);
          res.status(500).json({ message: "Internal server error" });
        } else {
          // console.log(dbres);
          res.status(200).json({ parkingInfo: dbres.rows });
        }
      }
    );
  } else {
    db.query(
      "SELECT * FROM parking_times WHERE spot_ID = $1 AND zone_ID = $2 AND availability = true",
      [req.params.spot_id, req.params.zone_id],
      (err, dbres) => {
        if (err) {
          console.log(err.stack);
          res.status(500).json({ message: "Internal server error" });
        } else {
          // console.log(dbres);
          res.status(200).json({ parkingInfo: dbres.rows });
        }
      }
    );
  }
});

router.get("/:zone_id", (req, res) => {
  if (req.query.startTime && req.query.endTime) {
    db.query(
      'WITH filtered_times AS (SELECT * FROM parking_times WHERE zone_id = $1 AND time_code >= $2 AND time_code <= $3 AND availability = true)\
      SELECT spot_id, zone_id, MIN(time_code) as "start_time", MAX(time_code) + 900 as "end_time", SUM(price) as "price" FROM filtered_times GROUP BY zone_id, spot_id ORDER BY spot_id ASC',
      [req.params.zone_id, req.query.startTime, req.query.endTime]
    ).then((dbres, err) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ message: "Internal server error" });
      } else {
        console.log(dbres.rows);
        res.status(200).json({ parkingInfo: dbres.rows });
      }
    });
  } else {
    // db.query('SELECT spot_id FROM parking_spots WHERE zone_ID = $1',[req.params.zone_id], (err,dbres) => {
    let todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = todayDate.getMonth();
    const day = todayDate.getDate();

    let todayStartTime = new Date(Date.UTC(year, month, day, 0, 0)).getTime() / 1000;
    let todayEndTime = new Date(Date.UTC(year, month, day, 23, 59)).getTime() / 1000;
    db.query(
      'WITH filtered_times AS (SELECT * FROM parking_times WHERE zone_id = $1 AND time_code >= $2 AND time_code <= $3 AND availability = true)\
      SELECT spot_id, zone_id, MIN(time_code) as "start_time", MAX(time_code) + 900 as "end_time", SUM(price) as "price" FROM filtered_times GROUP BY zone_id, spot_id, availability ORDER BY spot_id ASC',
      [req.params.zone_id, todayStartTime, todayEndTime]
    ).then((dbres, err) => {
      if (err) {
        console.log(err.stack);
        res.status(500).json({ message: "Internal server error" });
      } else {
        // db.query(
        //   'SELECT * FROM parking_times WHERE zone_id = $1 AND time_code >= $2 AND time_code <= $3 AND availability = true GROUP BY zone_id, spot_id, time_code, availability',
        //   [req.params.zone_id, todayStartTime, todayEndTime]
        // ).then((test_dbres, err) => { console.log(test_dbres.rows); });
        console.log(dbres.rows);
        res.status(200).json({ parkingInfo: dbres.rows });
      }
    });
  }
});

module.exports = router;
