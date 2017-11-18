const util = require('./util');

let objectsCommon = {
    select(params){
        let {cond, values, orderBy, limit} = util.parseSelectParams(params, 'object_id', fieldsFullnames);
        let queryString = `SELECT object_id, type_id as object_type_id, object_name FROM objects_common ${cond} ${orderBy} ${limit}`;
        return {
            text: queryString,
            values
        }
    },
    insert(params){
        return {
            text: `INSERT INTO objects_common (object_name, type_id) VALUES ($1, $2) RETURNING *`,
            values: [params.name, params['typeId']]
        }
    }
};
module.exports.objectsCommon = objectsCommon;

const fieldsShortnames = ['id', 'name', 'type_id'];
const fieldsFullnames = {
    'id': 'object_id',
    'name': 'object_name',
    'type_id': 'type_id'
};

module.exports.init_common = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'objects common', args => connection.client.query(objectsCommon.select(args.options)), fieldsShortnames);
};