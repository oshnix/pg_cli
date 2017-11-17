const util = require('./util');

let galaxies = {
    select(params){
        let {cond, values, orderBy, limit} = util.parseSelectParams(params, 'id', fieldsFullnames);
        let queryString = `SELECT * FROM select_galaxy ${cond} ${orderBy} ${limit}`;
        return {
            text: queryString,
            values
        }
    }
};
module.exports.galaxies = galaxies;

const fieldsShortnames = ['id', 'name', 'type', 'class'];
const fieldsFullnames = {
    'id': 'id',
    'name': 'name',
    'type': 'type_name',
    'class': 'class name'
};

module.exports.init_galaxies = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'galaxy', args => connection.client.query(galaxies.select(args.options)),fieldsShortnames)
};