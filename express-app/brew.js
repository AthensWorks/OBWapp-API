
var express = require('express');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var app = express();
var db_test = {
	host : 'localhost',
	user : 'username1234',
	password : 'password1234',
	database : 'database1234' };

var connection;

function dbMgr() {
  connection = mysql.createConnection(db_test);

  connection.connect(function(err) {
    if(err) {
      console.log('ERROR: Unable to connect to MySQL server: ', err);
      setTimeout(dbMgr, 2500);
    }
  });

  connection.on('error', function(err) {
    console.log('db error', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      dbMgr();
    } else {
      throw err;
    }
 });
}

dbMgr();

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('Brew Week App request from ' + req.ip);
});

app.get('/beers', function(req, res) {
  res.type('json');

  /*
  I think something like this will work instead:
  
  SELECT * FROM beers LEFT JOIN ON (
    SELECT likes.beer_id, count(*) AS tastes
    FROM likes
    WHERE likes.like_type = 1
    GROUP BY likes.beer_id
    ) tastes ON tastes.beer_id = beers.id;

    The subquery counts all the tastes for each beer and
    then we just join it with the beers table based on id.

   */
  var sql = "SELECT *,COUNT(likes.beer_id) AS taste_count FROM beers LEFT JOIN likes ON beers.id = likes.beer_id WHERE likes.like_type = 1 OR likes.like_type IS NULL GROUP BY likes.beer_id";

  connection.query(sql, function(err, rows) {
    res.json({ beers: rows });
  });

});


app.get('/establishments', function (req, res) {
  res.type('json');

  var sql = "select establishments.*, statuses.* FROM establishments, statuses WHERE establishments.id = statuses.establishment_id ORDER BY establishments.id;"

  connection.query(sql, function(err, rows) {
        var prow = [];
        var pcnt = 0;
        var bcnt = 0;
        var rowcount = 0;
        var bscnt = 0;
        var keeploop = 1;

        while (rows[rowcount]) {
                console.log('debug 1');
                prow.push({});
                console.log('debug 2');
                prow[pcnt].address = rows[rowcount].address;
                console.log('debug 3');
                prow[pcnt].beer_statuses = [];
                while (keeploop) {
                    prow[pcnt].beer_statuses.push({});
                    prow[pcnt].beer_statuses[bscnt].id = rows[bscnt].beer_id;
                    switch(rows[bscnt].status) {
                        case 4:
                                prow[pcnt].beer_statuses[bscnt].status = "empty-reported";
                                break;

                        case 3:
                                prow[pcnt].beer_statuses[bscnt].status = "empty";
                                break;

                        case 2:
                                prow[pcnt].beer_statuses[bscnt].status = "tapped";
                                break;

                        case 1:
                                prow[pcnt].beer_statuses[bscnt].status = "untapped";
                                break;

                        default:
                        case 0:
                                prow[pcnt].beer_statuses[bscnt].status = "unknown";
                                break;
                    }
                    if (bscnt == rows.length) {
                        keeploop = 0;
                    } else if (rows[bscnt].establishment_id < rows[bscnt+1].establishment_id) {
                        keeploop = 0;
                    } else {
                        bscnt++;
                    }
                }
                prow[pcnt].id = rows[rowcount].id;
                prow[pcnt].lat = rows[rowcount].lat;
                prow[pcnt].lon = rows[rowcount].lon;
                prow[pcnt].name = rows[rowcount].name;

                if (rows.length >= (rowcount + bscnt + 1)) {
                        rowcount = rowcount + bscnt + 1;
                        pcnt++;
                } else {
                        console.log('ERROR: length is %s, count is %s, beer count is %s',rows.length, rowcount, bscnt);
                        rowcount = rows.length;
                }
        }

        res.json({ establishments: prow });
  });
});


app.get('/establishment/:estid/beer_statuses', function (req, res) {
  res.send('beer status for establishment ' + req.params.estid);
});

app.post('/taste', function (req, res) {
  var like = {
    type_id: 1,
    type: "taste"
  };

  liker(req, res, like);
});

app.post('/favorite', function (req, res) {
  var like = {
    type_id: 2,
    type: "favorite"
  };

  liker(req, res, like);
});

var liker = function(req, res, like) {
  var beer_id     = req.body.beer_id;
  var device_guid = req.body.device_guid;
  var age         = req.body.age;

  var sql = "DELETE FROM likes WHERE device_guid = ? AND beer_id = ? AND like_type = ?";
  var inserts = [device_guid, beer_id, like.type_id];
  sql = mysql.format(sql, inserts);

  connection.beginTransaction(function(err){
    connection.query(sql, function(err, result) {
      console.log("DEBUG 116 %s", result);
      console.log("DEBUG 117 %s", like.type_id);

      if (result.affectedRows === 0) {
        connection.query('INSERT INTO likes SET ?', {device_guid: device_guid, beer_id: beer_id, age: age, like_type: like.type_id}, function(err, result) {
          console.log("DEBUG 121 %s", result);

          likeResponse(beer_id, like, res);
        })
      } else {
        likeResponse(beer_id, like, res);
      }
    });
  });

}

var likeResponse = function(beer_id, like, res) {
  var sql = "SELECT COUNT(*) FROM likes WHERE beer_id = ? AND like_type = ?";
  var inserts = [beer_id, like.type_id];
  sql = mysql.format(sql, inserts);

  connection.query(sql, function(err, result) {
    connection.commit(function(error){});

    var object = {
      beer_id: beer_id,
      count: countFromRow(result[0]),
      like_type: like.type
    };

    res.json(object);
  });
};

var countFromRow = function(row) {
  return row["COUNT(*)"];
}
var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Brew Week app listening at http://%s:%s', host, port);

});
