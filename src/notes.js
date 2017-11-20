const util = require('./util');

let notes = {
    select(params){
        let queryString = `SELECT * FROM scientists_objects_notes WHERE scientist_id = $1 AND object_id = $2`;
        let values = [params.scientist, params.object];
        return {
            text: queryString,
            values
        }
    },
    insertOrUpdate(params){
        let queryString = `INSERT INTO scientists_objects_notes VALUES ($1, $2, $3) ON CONFLICT (scientist_id, object_id) DO UPDATE SET note_body = $3`;
        let values = [params.options.scientist, params.options.object, params.text];
        return {
            text: queryString,
            values
        }
    }
};

function validateNoteParams(args){
    if(args.options.scientist == undefined || typeof args.options.scientist != 'number'){
        return 'scientist id should present and be number'
    }
    if(args.options.object == undefined || typeof args.options.object != 'number'){
        return 'object id should present and be number'
    }
    return true
}

module.exports.notes = notes;
module.exports.init_notes = (vorpal, connection) => {
    vorpal
        .command('note select', 'only one note can be selected')
        .option('-s, --scientist <scientistId>', 'Id of scientist writing note')
        .option('-o, --object <objectId>', 'Id of object about which note is')
        .validate(validateNoteParams)
        .action((args, callback) => {
            connection.client.query(notes.select(args.options))
                .then(response => {
                    util.logRows(response);
                    callback();
                })
                .catch(error => {
                    util.logError(error);
                    callback();
                });
        });
    vorpal
        .command('note insert or update', 'insert new note, if present - update')
        .option('-s, --scientist <scientistId>', 'Id of scientist writing note')
        .option('-o, --object <objectId>', 'Id of object about which note is')
        .validate(validateNoteParams)
        .action(function(args, callback){
            let cont = args => {
                connection.client.query(notes.insertOrUpdate(args))
                    .then(response => {
                        util.logOperation(response);
                        callback();
                    })
                    .catch(error => {
                        util.logError(error);
                        callback();
                    })
            };
            if(args.stdin && args.stdin[0] !== undefined){
                args.text = args.stdin[0];
                cont(args)
            } else {
                this.prompt({type: 'stdin', name: 'text', message: 'Input note: '}, (res) => {
                    if(res.text != ''){
                        args.text = res.text;
                        cont(args)
                    } else {
                        console.error('Input should be non empty');
                        callback();
                    }
                });
            }
        })

};