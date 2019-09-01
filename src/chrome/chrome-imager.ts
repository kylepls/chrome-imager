import {Imager, newImager} from './browser';

export interface ImageCommand {
    url: string;
    parentCssSelector: string;
    textCssSelector?: string;
    payload?: string;
    incremental?: boolean;
}

export interface CommandResult {
    images: ImageResult[]
}

export interface ImageResult {
    b64: string
    part?: string
}

export async function run(commands: ImageCommand[]): Promise<CommandResult[]> {
    console.log("Starting Chrome...");
    const imager: Imager = await newImager();

    const output = [] as CommandResult[];
    for (const command of commands) {
        await imager.goto(command.url, command.payload);
        if (command.incremental) {
            const result: CommandResult = await imager.incremental(command.parentCssSelector, command.textCssSelector);
            output.push(result);
        } else {
            const commandRes: CommandResult = {
                images: [{
                    b64: await imager.screenshotDOMElement(command.parentCssSelector)
                }]
            };
            output.push(commandRes);
        }
    }

    await imager.close();
    return output;
}
