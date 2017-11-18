const util = require('./util');

let objectTypes = {
    select(params){
        let {cond, values, orderBy, limit} = util.parseSelectParams(params, 'object_type_id', fieldsFullnames);
        let queryString = `SELECT * FROM objects_types t JOIN objects_classes c on t.object_class_id = c.object_class_id ${cond} ${orderBy} ${limit}`;
        return {
            text: queryString,
            values
        }
    },
    insert(params){
        let queryString = `INSERT INTO objects_types (object_type_name, object_class_id) VALUES ($1, $2) RETURNING *`;
        return {
            text: queryString,
            values: [params.name, params['classId']]
        }
    },
    delete(params){
        let {cond, values} = util.createWhere([{field: 'object_type_id', operator: '=', value: params.id}]);
        let queryString = `DELETE FROM objects_types ${cond}`;
        return {
            text: queryString,
            values
        }
    }
};

const fieldsShortnames = ['id', 'name', 'class_id'];
const fieldsFullnames = {
    'id': 'object_type_id',
    'name': 'object_type_name',
    'class_id': 'object_class_id'
};
let insertFields = Object.create(null);
insertFields.name = {
    short: 'n',
    full: 'name',
    name: 'name',
    description: 'name of type',
    type: 'string'
};
insertFields.class = {
    short: 'c',
    full: 'class',
    name: 'classId',
    description: 'Id of present object class',
    type: 'number'
};

module.exports.init_types = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'type', args =>  connection.client.query(objectTypes.select(args.options)), fieldsShortnames);
    util.createInsertCommand(vorpal, insertFields, 'type',
        args => connection.client.query(objectTypes.insert(args.options)), 'insert new object type');
    util.createDeleteCommand(vorpal, 'type', args => connection.client.query(objectTypes.delete(args)));
};