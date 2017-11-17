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
    insert(name, class_id){
        let queryString = `INSERT INTO objects_types (object_type_name, object_class_id) VALUES ($1, $2) RETURNING *`;
        let values = [name, class_id];
        return {
            text: queryString,
            values
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

module.exports.init_types = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'type', args =>  connection.client.query(objectTypes.select(args.options)), fieldsShortnames);
    vorpal
        .command('type insert <type_name>', 'insert object type')
        .option('-c, --class-id <class_id>', 'specifies class id')
        .validate(args => {
            if(typeof args['type_name'] != 'string' || args['type_name'].length < 1){
                return "Type name should be non-empty string";
            }
            let id = args.options['class-id'];
            if(id === undefined){
                return "-c option is required"
            }
            if(!util.isUint(id)){
                return "Class id should be positive integer";
            }
            return true
        })
        .action((args, callback) => {
            connection.client.query(objectTypes.insert(args['type_name'], args.options['class-id']))
                .then(response => {
                    util.logOperation(response);
                    util.logRows(response);
                    callback();
                }).catch(error => {
                    util.logError(error);
                    callback()
                });
        });
    util.createDeleteCommand(vorpal, 'type', args => connection.client.query(objectTypes.delete(args)));
};