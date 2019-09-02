import {createServer} from 'http';
import {exec} from "child_process";

const CHROME_PORT = 9222;

export function waitForChromeToTerminate() {
    let retry = 10;
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(CHROME_PORT);
        server.once('listening', () => {
            console.log("Port open");
            server.close(() => resolve());
        });
        server.on('error', () => {
            console.log("Port busy, waiting...");
            setTimeout(() => {
                if (retry) {
                    retry--;
                    server.listen(9222);
                } else {
                    exec('killall -9 chrome');
                    reject('Chrome is still running');
                }
            }, 50);
        });
    })
}