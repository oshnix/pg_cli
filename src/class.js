const util = require('./util');

let objectClasses = {
    select(params){
        let {cond, values, orderBy, limit} = util.parseSelectParams(params, 'object_class_id', fieldsFullnames);
        let queryString = `SELECT * FROM objects_classes ${cond} ${orderBy} ${limit}`;
        return {
            text: queryString,
            values
        }
    },
    insert(params){
        return {
            text: "INSERT INTO objects_classes (object_class_name) VALUES($1) RETURNING *",
            values: [params.name]
        }
    },
    delete(params){
        let {cond, values} = util.createWhere([{field: 'object_class_id', operator: '=', value: params.id}]);
        let queryString = `DELETE FROM objects_classes ${cond}`;
        return {
            text: queryString,
            values
        }
    }
};
module.exports.objectClasses = objectClasses;

const fieldsShortnames = ['id', 'name'];
const fieldsFullnames = {
    'id': 'object_class_id',
    'name': 'object_class_name'
};

let insertFields = Object.create(null);
insertFields.name = {
    short: 'n',
    full: 'name',
    name: 'name',
    description: 'name of new class',
    type: 'string'
};

module.exports.init_classes = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'class', args => connection.client.query(objectClasses.select(args.options)), fieldsShortnames);
    util.createInsertCommand(vorpal, insertFields, 'class',
            args => connection.client.query(objectClasses.insert(args.options)), 'insert new object class into object_classes');
    util.createDeleteCommand(vorpal, 'class', args => connection.client.query(objectClasses.delete(args)));
};