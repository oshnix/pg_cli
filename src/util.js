const prettyjson = require('prettyjson');
const colors = require('colors');

let util = {
    isCreatedFromNull(object){
        return typeof object === 'object' && object != null && !Object.isPrototypeOf(object);
    },
    createWhere(params) {
        let cond = [], values = [], i = 1;
        if (Array.prototype.isPrototypeOf(params)) {
            for (let {field, value, operator} of params) {
                if (value) {
                    cond.push(`${field} ${operator} \$${i}`);
                    ++i;
                    values.push(value)
                }
            }
        }
        cond.join(' and ');
        if (cond.length > 0) cond = "WHERE " + cond;
        return {cond, values};
    },
    isUint(num){
        return !isNaN(num) && num >= 1 && (num % 1 == 0);
    },
    logRows(response){
        console.log(prettyjson.render(response.rows));
    },
    logOperation(response){
        console.log("\t" + colors.green(response.command) + colors.blue(` ${response.rowCount}`));
    },
    logError(error){
        console.error(colors.red(error.code !== undefined ? `Error with code ${+error.code} happened` : 'Unknown error'));
        if(error.message !== undefined) console.error(colors.green('\tMessage: ') + colors.white(error.message));
        if(error.detail !== undefined) console.error(colors.green('\tDetails: ') + colors.white(error.detail));
    },
    createSelectCommand(vorpal, name, promise, fieldsShortnames){
        vorpal
            .command(`${name} select`, `select from ${name}`)
            .option('-i, --id <id>', 'select by id')
            .option('-l, --limit <count>', 'limit number of selected strings')
            .option('-o, --order <order>', 'output data in chosen order', fieldsShortnames)
            .validate(args => {
                if(args.options.id !== undefined && !util.isUint(args.options.id)){
                    return "Id should be positive integer";
                }
                if(args.options.limit !== undefined && !util.isUint(args.options.limit)){
                    return "Limit should be positive integer"
                }
                if(args.options.order !== undefined && -1 == fieldsShortnames.indexOf(args.options.order)){
                    return "Order field is not present in table";
                }
                return true;
            })
            .action((args, callback) => {
                let key;
                if(args.options.id){
                    key = `${name}${args.options.id}`;
                    delete args.options.limit;
                    delete args.options.order;
                } else {        console.log(params);
                    key = null;
                }
                promise(args, key)
                    .then(response => {
                        util.logRows(response);
                        callback();
                    }).catch(error => {
                        console.error(error);
                        callback();
                    })
                });
    },
    createRedisPromise(connection, query){
        return (args, key) => {
            if(key){
                return new Promise((resolve, reject) => {
                    connection.redisClient.get(key, (err, response) => {
                        if(err){
                            reject(err);
                            return;
                        }
                        if(response){
                            resolve({rows: [JSON.parse(response)]});
                        } else {
                            connection.client.query(query(args.options))
                                .then(response => {
                                    connection.redisClient.set(key, JSON.stringify(response.rows[0]), 'EX', 30);
                                    resolve(response)
                                })
                                .catch(error => {
                                    reject(error);
                                })
                        }
                    })
                })
            } else {
                return connection.client.query(query(args.options));
            }
        }
    },
    parseSelectParams(params, field, fieldsFullnames){
        let retVal = {cond: "", values: [], orderBy: "", limit: ""};
        if(params.id !== undefined){
            let condVals = this.createWhere([{field, operator: "=", value: params.id}])
            retVal.cond = condVals.cond;
            retVal.values = condVals.values;
            if(params.limit !== undefined || params.order !== undefined){
                console.warn(colors.yellow('Warning:\tID is present. Order by and limit options are ignored'));
            }
        } else {
            if(params.order){
                retVal.orderBy = `ORDER BY ${fieldsFullnames[params.order]}`
            }
            if(params.limit){
                retVal.limit = `LIMIT ${params.limit}`
            }
        }
        return retVal;
    },
    createDeleteCommand(vorpal, name, promise){
        vorpal
            .command(`${name} delete <id>`, `delete from ${name}`)
            .validate(args => {
                if(!this.isUint(args.id)) return "id should be a positive integer";
                return true;
            })
            .action((args, callback) => {
                promise(args)
                    .then(response => {
                        this.logOperation(response);
                        callback();
                    })
                    .catch(error => {
                        this.logError(error);
                        callback();
                    })
            })
    },
    createInsertCommand(vorpal, options, name, promise, description){
        if(!this.isCreatedFromNull(options)){
            throw new Error('Object is not null-prototyped');
        }
        let temp = vorpal.command(`${name} insert`, description);
        for(let i in options){
            let option = options[i];
            temp = temp.option(`-${option.short}, --${option.name} <${option.name}>`, option.description,
                (option.set !== undefined && Array.prototype.isPrototypeOf(option.set) ? option.set : undefined))
        }
        temp
            .validate(args => {
                for(let i in options){
                    let option = options[i];
                    if(option.set !== undefined && ! option.set.indexOf(args.options[option.name])){
                        return colors.red(`Option ${option.name} can be only one of values from ${prettyjson.render(option.set)}`)
                    }
                    else if(args.options[option.name] === undefined || typeof args.options[option.name] !== option.type){
                        return colors.red(`Option ${option.name} is not present or has wrong type (${option.type} expected)`)
                    }
                }
                return true
        })
            .action((args, callback) => {
                promise(args)
                    .then(response => {
                        this.logOperation(response);
                        this.logRows(response);
                        callback();
                    })
                    .catch(error => {
                        this.logError(error);
                        callback()
                    })
            })
    }
};

module.exports = util;