const prettyjson = require('prettyjson');
const colors = require('colors');

let util = {
    /**
     * @param table
     * @param {Object<null>} obj - should be object created from null
     */
    //TODO find usage in project or delete
    insertCreator(table, obj){
        if(typeof obj !== 'object' || obj == null){
            throw new Error('Argument should be an object');
        }
        if(Object.isPrototypeOf(obj)){
            throw new Error('Prototype of object should be null');
        }
        let values = [], keys = [], count = 1, prepVals = [];
        let string = `INSERT INTO ${table}`;
        for(let key in obj){
            keys.push(key);
            values.push(obj[key])
            prepVals.push(`\$${count++}`)
        }
        if(count == 1){
            throw new Error('Arguments list is empty')
        }
        string += ` (${keys.join(",")}) VALUES (${prepVals.join(",")});`
        return {
            text: string,
            values
        }
    },
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
            .command(name + ' select', `select from ${name}`)
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
                promise(args)
                    .then(response => {
                        util.logRows(response);
                        callback();
                    }).catch(error => {
                        console.error(error);
                        callback();
                    })
                });
    },
    parseSelectParams(params, field, fieldsFullnames){
        let retVal = {cond: "", values: [], orderBy: "", limit: ""};
        if(params.id !== undefined){
            let condVals = this.createWhere([{field, operator: "=", value: params.id}])
            retVal.cond = condVals.cond;
            retVal.values = condVals.values
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
            temp = temp.option(`-${option.short}, --${option.full} <${option.name}>`, option.description,
                (option.set !== undefined && Array.prototype.isPrototypeOf(option.set) ? option.set : undefined))
        }
        temp
            .validate(args => {
                //TODO check for set
                for(let i in options){
                    let option = options[i];
                    if(args.options[option.name] === undefined || typeof args.options[option.name] !== option.type){
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