require('dotenv').config();
const vorpal = require('vorpal')();
const {Pool, types} = require('pg');
const {init_classes} = require('./src/class');
const {init_types} = require('./src/objectTypes');
const {init_common} = require('./src/common');
const {init_galaxies} = require('./src/galaxies')

types.setTypeParser(16438, val => {
    val = val.substr(1, val.length -2);
    val = val.split(',');
    return {
        x: parseFloat(val[0]),
        y: parseFloat(val[1])
    }
});

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
init_common(vorpal, connection);
init_galaxies(vorpal, connection);

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

