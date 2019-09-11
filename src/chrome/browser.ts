import chromium from "chrome-aws-lambda";
import puppeteer, {Base64ScreenShotOptions, BoundingBox} from 'puppeteer-core';
import fs from 'fs';
import {splitString} from '../util/textutils'
import {CommandResult, ImageResult} from "./chrome-imager";

const normalViewport = {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 2
};

export async function newImager() {
    const imager = new Imager();
    await imager.start();
    return imager;
}

let executions = 0;
let path;
let browser;

async function getPath() {
    if (!path) {
        path = await chromium.executablePath;
    }
    return path;
}

async function getBrowser() {
    console.log("Path: " + await getPath());
    if (!browser) {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await getPath(),
            headless: chromium.headless
        });
    }
    return browser;
}

async function closeBrowser() {
    if (browser) {
        console.log("Killing chrome");
        browser.close();
        browser = null;
    }
}

export class Imager {

    private browser;
    private page;

    public async start() {
        this.browser = await getBrowser();
        this.page = await this.browser.newPage();
        await this.page.setViewport(normalViewport);
    }

    public async close() {
        executions += 1;
        if (this.page) {
            await this.page.close();
        }
        console.log(`Executions: ${executions}`);
        if (executions > 7) {
            await closeBrowser();
        }
    }

    public async goto(url: string, payload?: string, args?: any) {
        console.log(`Goto url ${url}`);
        await this.page.goto(url, {...args});
        if (payload) {
            console.log("Eval payload...");
            await this.page.evaluate(payload);
            console.log("Eval complete");
        }
    }

    public async incremental(parentSelector: string, textSelector): Promise<CommandResult> {
        const textHeader = await this.page.$(textSelector);
        if (textHeader == null) {
            const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
            fs.writeFileSync('error.html', bodyHTML);
            throw new Error(`Unable to find ${textHeader} in HTML\nerror.html`)
        }
        const textDiv = (await textHeader.$x('..'))[0];

        const htmlString: string = await this.getHtml(textDiv);
        const parts: string[] = splitString(htmlString);
        console.log("Parts: " + JSON.stringify(parts));
        await this.page.evaluate(e => e.innerHTML = "", textDiv);

        const results = [] as ImageResult[];
        for (const part of parts) {
            console.log(`Setting text content to ${part}`)
            await this.page.evaluate((e, part) => e.innerHTML = e.innerHTML + part, textDiv, part);
            console.log(`Taking screenshot of ${part}`);
            const base64String = await this.screenshotDOMElement(parentSelector);
            console.log("Took screenshot to b64 string");
            results.push({b64: base64String, part: this.removeHtml(part)});
        }

        console.log(`Got ${results.length} images`);
        return {images: results};
    }

    private removeHtml(part: string): string {
        return part.replace(/<[^>]*>/g, "");
    }

    private async getHtml(element) {
        return await this.page.evaluate(element => {
            return element.outerHTML;
        }, element);
    }

    async screenshotDOMElement(parentSelector: string): Promise<string> {
        const boundingBox: BoundingBox = await this.page.evaluate(selector => {
            const element = document.querySelector(selector);
            if (!element) {
                return null;
            } else {
                const {x, y, width, height} = element.parentElement.getBoundingClientRect();
                return {x, y, width, height};
            }
        }, parentSelector);

        if (!boundingBox) {
            throw Error(`Could not find element that matches selector: '${parentSelector}'.`);
        }

        const screenshotOptions = Imager.makeScreenshotOptions(boundingBox, 0);
        const b64string = await this.page.screenshot(screenshotOptions);
        return b64string;
    }

    private static makeScreenshotOptions(boundingBox: BoundingBox, padding: number): Base64ScreenShotOptions {
        return {
            clip: {
                x: boundingBox.x - padding,
                y: boundingBox.y - padding,
                width: boundingBox.width + padding * 2,
                height: boundingBox.height + padding * 2
            },
            encoding: "base64"
        };
    }
}
