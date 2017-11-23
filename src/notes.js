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
    if(typeof args.options.scientist != 'number'){
        return '\tscientist id should present and be number';
    }
    if(typeof args.options.object != 'number'){
        return '\tobject id should present and be number';
    }
    return true;
}

module.exports.notes = notes;
module.exports.init_notes = (vorpal, connection) => {
    let sub = connection.subClient;

    sub.on('pmessage', (pattern, channel, message) => {
        let key = message.split(':');
        if(key.length < 2) return;
        key = key[1];
        connection.redisClient.multi()
            .get(key)
            .del(key)
            .exec((err, replies) => {
                if(err) return;
                let insert = JSON.parse(replies[0]);
                if(insert.shouldCommit){
                    connection.client.query(notes.insertOrUpdate({
                        text: insert['note_body'],
                        options: {
                            scientist: insert['scientist_id'],
                            object: insert['object_id']}
                    }));
                    console.log("COMMIT");
                }
            })
    });

    sub.psubscribe('__keyevent@0__:expired');

    vorpal
        .command('note select', 'only one note can be selected')
        .option('-s, --scientist <scientistId>', 'Id of scientist writing note')
        .option('-o, --object <objectId>', 'Id of object about which note is')
        .validate(validateNoteParams)
        .action((args, callback) => {
            let key = `note${args.options.scientist}${args.options.object}`;
            connection.redisClient.get(key, (err, response) => {
                if(!response){
                    connection.client.query(notes.select(args.options))
                        .then(response => {
                            util.logRows(response);
                            if(response.rows.length > 0){
                                connection.redisClient.set(key, JSON.stringify(response.rows[0]), 'EX', 30);
                            }
                            callback();
                        })
                        .catch(error => {
                            util.logError(error);
                            callback();
                        });
                } else {
                    util.logRows({rows: [JSON.parse(response)]});
                }
            });
        });
    vorpal
        .command('note insert or update', 'insert new note, if present - update')
        .option('-s, --scientist <scientistId>', 'Id of scientist writing note')
        .option('-o, --object <objectId>', 'Id of object about which note is')
        .validate(validateNoteParams)
        .action(function(args, callback){
            let cont = args => {
                let key = `note${args.options.scientist}${args.options.object}`;
                connection.redisClient.get(key, (err, response) => {
                    if (response !== null) {
                        let note = JSON.parse(response);
                        if (note.shouldCommit !== undefined) {
                            note['note_body'] = args.text;
                            note.shouldCommit = true;
                            connection.redisClient.multi()
                                .set(key, JSON.stringify(note))
                                .set(`shadow:${key}`, "", 'EX', 30).exec();
                            callback();
                            return;
                        }
                        connection.redisClient.delete(key);
                    }
                    connection.client.query(notes.insertOrUpdate(args))
                        .then(response => {
                            util.logOperation(response);
                            let note = {
                                note_body: args.text,
                                scientist_id: args.options.scientist,
                                object_id: args.options.object
                            };
                            note.shouldCommit = false;
                            connection.redisClient.multi()
                                .set(key, JSON.stringify(note))
                                .set(`shadow:${key}`, "", 'EX', 30).exec();
                            callback();
                        })
                        .catch(error => {
                            util.logError(error);
                            callback();
                        })
                });
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