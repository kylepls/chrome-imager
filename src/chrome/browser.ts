import puppeteer, {Base64ScreenShotOptions, BoundingBox} from 'puppeteer';
import fs from 'fs';
import {getChrome} from '~/chrome-script'
import {splitString} from '~/textutils'
import {CommandResult, ImageResult} from "~chrome-imager";

const normalViewport = {
    width: 3840,
    height: 2160
};

export async function newImager() {
    const imager = new Imager();
    await imager.start();
    return imager;
}

export class Imager {

    private browser;
    private page;

    public async start() {
        const chrome = await getChrome();
        this.browser = await puppeteer.connect({
            browserWSEndpoint: chrome.endpoint
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport(normalViewport);
    }

    public close() {
        this.browser.close();
    }

    public async goto(url: string, payload?: string, args?: any) {
        console.log(`Goto url ${url}`);
        await this.page.goto(url, {waitUntil: 'networkidle2', ...args});
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
        await this.page.evaluate(e => e.innerHTML = "", textDiv);

        const results = [] as ImageResult[];
        for (const part of parts) {
            await this.page.evaluate((e, part) => e.innerHTML = e.innerHTML + part, textDiv, part);
            const base64String = await this.screenshotDOMElement(parentSelector);
            results.push({b64: base64String, part});
        }

        return { images: results };
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
                return element.getBoundingClientRect();
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
