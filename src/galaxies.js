const util = require('./util');
const {objectsCommon} = require('./common');

let galaxies = {
    select(params){
        let {cond, values, orderBy, limit} = util.parseSelectParams(params, 'id', fieldsFullnames);
        let queryString = `SELECT * FROM select_galaxy ${cond} ${orderBy} ${limit}`;
        return {
            text: queryString,
            values
        }
    },
    insert(params){
        return {
            text: `INSERT INTO galaxies (object_id, galaxy_coordinates) VALUES ($1, ($2, $3)) RETURNING *`,
            values: [params.id, params.x, params.y]
        }
    }
};
module.exports.galaxies = galaxies;

async function insertGalaxy(client, params){
    try {
        await client.query('BEGIN');
        let obj = await client.query(objectsCommon.insert(params));
        params.id = obj.rows[0]['object_id']
        let response = await client.query(galaxies.insert(params));
        let res = await client.query('COMMIT');
        console.log(res);
        console.log(res);
        return response;
    }
    catch (err){
        await client.query('ROLLBACK');
        throw err;
    }
}

const fieldsShortnames = ['id', 'name', 'type', 'class'];
const fieldsFullnames = {
    'id': 'id',
    'name': 'name',
    'type': 'type_name',
    'class': 'class name'
};

let insertFields = Object.create(null);
insertFields.name = {
    short: 'n',
    name: 'name',
    description: 'name of galaxy',
    type: 'string'
};

insertFields.type = {
    short: 't',
    full: 'type',
    name: 'typeId',
    description: 'Id of galaxy type',
    type: 'number'
};

insertFields.x ={
    short: 'x',
    name: 'x',
    description: 'X coordinate of galaxy',
    type: 'number'
};

insertFields.y = {
    short: 'y',
    name: 'y',
    description: 'Y coordinate of galaxy',
    type: 'number'
};


module.exports.init_galaxies = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'galaxy', args => connection.client.query(galaxies.select(args.options)),fieldsShortnames);
    util.createInsertCommand(vorpal, insertFields, 'galaxy',
        args => insertGalaxy(connection.client, args.options), 'insert galaxy into both common and galaxies tables');
};