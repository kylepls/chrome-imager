export function splitString(text: string): string[] {
    const strings: string[] = [];
    const pattern: RegExp = /((?:[!.]*\s*<\/[a-z]+>(\\n)*)+|(?:[!.]+\s*))(\\n)*/g;
    let matcher;
    let leftIndex = 0;
    while ((matcher = pattern.exec(text)) != null) {
        const rightIndex = matcher.index + matcher[0].length;
        strings.push(text.substring(leftIndex, rightIndex));
        leftIndex = rightIndex;
    }

    if (leftIndex < text.length) {
        strings.push(text.substring(leftIndex));
    }

    return strings;
}
