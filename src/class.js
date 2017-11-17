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
    insert(name){
        return {
            text: "INSERT INTO objects_classes (object_class_name) VALUES($1) RETURNING *",
            values: [name]
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

module.exports.init_classes = (vorpal, connection) => {
    util.createSelectCommand(vorpal, 'class',(args, callback) => {
        connection.client.query(objectClasses.select(args.options)).then(response => {
            util.logRows(response);
            callback();
        }).catch(error => {
            console.error(error);
            callback();
        })
    }, fieldsShortnames);
    vorpal
        .command('class insert <name>', 'insert into class')
        .action((args, callback) => {
            connection.client.query(objectClasses.insert(args.name)).then(response => {
                util.logOperation(response);
                util.logRows(response);
                callback();
            }).catch(error => {
                console.error(error);
                callback();
            });
        });

    util.createDeleteCommand(vorpal, 'class', args => connection.client.query(objectClasses.delete(args)));
};