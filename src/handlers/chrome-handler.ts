import {APIGatewayEvent, Handler} from 'aws-lambda';
import {ImageCommand, run} from '../chrome/chrome-imager';
import 'source-map-support/register';

export const chromeHandler: Handler = async (event: APIGatewayEvent) => {
    const body = JSON.parse(event.body as any);
    const commands: ImageCommand[] = parseCommands(body);

    console.log(`Running: ${commands}`);

    const b64Strings = await run(commands);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(b64Strings, null, 0),
    };
};

function parseCommands(body: any[]): ImageCommand[] {
    return body.map(c => {
        return {
            url: c.url as string,
            textCssSelector: c.textCssSelector as string,
            parentCssSelector: c.parentCssSelector as string,
            payload: c.payload as string,
            incremental: Boolean(c.incremental),
        }
    })
}
