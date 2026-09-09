// Quote PostgREST syntax separately from LIKE wildcards.
export const postgrestLiteral = (value: string) => JSON.stringify(value);
export const literalSearch = (value: string) => `%${value.replace(/[\\%_]/g, char => `\\${char}`)}%`;
