require('dotenv').config();
const vorpal = require('vorpal')();
const { Pool } = require('pg');
const {init_classes} = require('./src/class');
const {init_types} = require('./src/objectTypes');

/*
const redis = require("redis"), client = redis.createClient();
client.set("string key", "string val", redis.print);
*/

let connection = {client: null};
const pool = new Pool();

pool.on('error', error => {
    console.error("Shit in pool happened");
    console.error(error);
    process.exit(-1);
});


init_classes(vorpal, connection);
init_types(vorpal, connection);
//init_commons(vorpal);
//init_galaxies(vorpal);

pool.connect().then(client => {
    connection.client = client;
    client.on('end', () => {
        console.log("Connection closed");
        process.exit(-3);
    });
    vorpal
        .delimiter("js@postgres $")
        .show();
}).catch(error => {
	console.error(error);
	console.error("Connection failed. Please remove error and try again");
	process.exit(-1);
});

