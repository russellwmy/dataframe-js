
const REPLACMENTS = [
    ['INNER JOIN', 'INNERJOIN'],
    ['LEFT JOIN', 'LEFTJOIN'],
    ['RIGHT JOIN', 'RIGHTJOIN'],
    ['FULL JOIN', 'FULLJOIN'],
];

const OPERATORS_HANDLER = {
    'IN': (a, b) => b.includes(a),
    'LIKE': (a, b) => b.includes(a) || a.includes(b),
    '>=': (a, b) => a >= b,
    '<=': (a, b) => a <= b,
    '!=': (a, b) => a !== b,
    '<': (a, b) => a < b,
    '>': (a, b) => a > b,
    '=': (a, b) => a === b,
    'AND': (a, b) => a && b,
    'OR': (a, b) => a || b,
};

function xSplit(stringToSplit, ...patterns) {
    return patterns.reduce(
        (prev, next) => prev.map(str => str.split(next)).reduce((p, n) => [...p, ...n], []),
        [stringToSplit]
    );
}

function xContains(stringWhereFind, ...patterns) {
    return patterns.filter(pattern => stringWhereFind.includes(pattern));
}

const OPERATIONS_HANDLER = {
    'WHERE': (operation) => {
        const operationalTerms = xSplit(operation.join(' '), ' AND ', ' OR ');
        return df => df.filter(row => {
            const conditionalOperators = operation.filter(term => ['AND', 'OR'].includes(term.toUpperCase()));
            return operationalTerms.map(operationalTerm => {
                const operatorToApply = xContains(operationalTerm, ...Object.keys(OPERATORS_HANDLER))[0];
                const terms = operationalTerm.replace(' ', '').split(operatorToApply);
                return OPERATORS_HANDLER[operatorToApply](row.get(terms[0]), terms[1]);
            }).reduce((prev, next) => OPERATORS_HANDLER[conditionalOperators.shift()](prev, next));
        });
    },
    'JOIN': (operation) => {},
    'INNERJOIN': (operation) => {},
    'LEFTJOIN': (operation) => {},
    'RIGHTJOIN': (operation) => {},
    'FULLJOIN': (operation) => {},
    'UNION': (operation) => {},
};

function replaceTermsInQuery(query) {
    let replacedQuery = query;
    REPLACMENTS.forEach(
        ([joinType, replacment]) => {
            replacedQuery = replacedQuery.replace(joinType, replacment).replace(joinType.toLowerCase(), replacment);
        }
    );
    return replacedQuery;
}

function sqlSplitter(query) {
    const splittedQuery = replaceTermsInQuery(query).split(' ');
    const fromLoc = splittedQuery.findIndex(word => word.toUpperCase() === 'FROM');
    return {
        selections: splittedQuery.slice(0, fromLoc),
        table: splittedQuery[fromLoc + 1],
        operations: splittedQuery.slice(fromLoc + 2, splittedQuery.length),
    };
}

function sqlParser(query, tables) {
    const {selections, table, operations} = sqlSplitter(query);
    const operationTypes = Object.keys(OPERATIONS_HANDLER);
    const operationsLoc = operations.map(
        (word, index) => operationTypes.includes(word.toUpperCase()) ? index : undefined
    ).filter(loc => loc !== undefined);

    const splittedOperations = operationsLoc.map(
        (loc, index) => {
            return OPERATIONS_HANDLER[operations[loc].toUpperCase()](
                operations.slice(loc + 1, operationsLoc[index + 1] ? operationsLoc[index + 1] : operations.length)
            );
        }
    );


    const applyOperations = splittedOperations.reduce((prev, next) => (df) => next(prev(df)), (df) => df)
    const applySelections = (x) => x;
    return applySelections(applyOperations(tables[table]));
}


class SQL {

    static tables = {};

    static request(query) {
        return sqlParser(query, SQL.tables);
    }

    static listTables() {
        return Object.keys(SQL.tables);
    }

    static addTable(name, df) {
        SQL.tables[name] = df;
    }

    constructor(df) {
        this.df = df;
        this.name = 'sql';
    }

    register(tableName) {
        SQL.addTable(tableName, this.df);
        return this.df;
    }

}

export default SQL;
