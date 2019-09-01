import {splitString} from "./textutils";
import {expect} from 'chai';
import 'mocha';

describe('Split function', () => {

    it('Split', () => {
        const result = splitString("<div><p>Part 1</p><p>Part 2</p></div>");
        expect(result).to.eql(['<div><p>Part 1</p>', '<p>Part 2</p></div>']);
    });

});