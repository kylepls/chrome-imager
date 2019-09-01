import {APIGatewayEvent, Handler} from 'aws-lambda';
import {ImageCommand, runAndCompress} from './chrome-imager';
import 'source-map-support/register';

export const handler: Handler = async (event: APIGatewayEvent) => {
    const data = JSON.parse(event.body as any);

    const command: ImageCommand = {
        url: data.url as string,
        textCssSelector: data.textCssSelector as string,
        parentCssSelector: data.parentCssSelector as string,
        payload: data.payload as string,
        incremental: Boolean(data.incremental),
    };
    console.log(`Running: ${command}`);

    const encodedFiles = await runAndCompress(command);
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(encodedFiles, null, 0),
    };
};
