import XAPI, { GetStatementsParams, Statement } from "@xapi/xapi";

let _client: XAPI | null = null;

const getClient = (): XAPI | null => {
    const endpoint = process.env.XAPI_ENDPOINT;
    const username = process.env.XAPI_KEY;
    const password = process.env.XAPI_SECRET;

    if (!endpoint || !username || !password) {
        console.warn("xAPI not configured, skipping.");
        return null;
    }

    if (!_client) {
        _client = new XAPI({
            endpoint,
            auth: XAPI.toBasicAuth(username, password),
        });
    }

    return _client;
};

export const sendXApiStatement = async (statement: Statement) => {
    const client = getClient();
    if (!client) return;
    await client.sendStatement({ statement });
};

export const queryStatements = async (params: GetStatementsParams): Promise<Statement[]> => {
    const client = getClient();
    if (!client) return [];

    const all: Statement[] = [];
    let response = await client.getStatements(params);
    all.push(...(response.data.statements as Statement[]));

    while (response.data.more) {
        response = await client.getMoreStatements({ more: response.data.more });
        all.push(...(response.data.statements as Statement[]));
    }

    return all;
};
