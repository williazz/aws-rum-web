import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';
import { Selector } from 'testcafe';
import {
    STATUS_202,
    BUTTON_ID_1,
    DISPATCH_COMMAND,
    COMMAND,
    PAYLOAD,
    SUBMIT,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../test-utils/integ-test-utils';

import { SESSION_START_EVENT_TYPE } from '../SessionManager';

const randomSessionClickButton: Selector = Selector('#randomSessionClick');
const disallowCookiesClickButton: Selector = Selector('#disallowCookies');

const addSessionAttributesButton1: Selector = Selector(
    `#addSessionAttributes1`
);
const addSessionAttributesButton2: Selector = Selector(
    `#addSessionAttributes2`
);

const recordPageViewButtonOne: Selector = Selector(`#recordPageViewOne`);

const recordPageViewButtonTwo: Selector = Selector(`#recordPageViewTwo`);

const addSessionAttributesCallbackButton: Selector = Selector(
    `#addSessionAttributesCallback`
);
const clearSessionAttributesCallbackButton: Selector = Selector(
    `#clearSessionAttributesCallback`
);

const BROWSER_LANGUAGE = 'browserLanguage';
const BROWSER_NAME = 'browserName';
const BROWSER_VERSION = 'browserVersion';
const OS_NAME = 'osName';
const OS_VERSION = 'osVersion';
const DEVICE_TYPE = 'deviceType';
const PLATFORM_TYPE = 'platformType';

const button1: Selector = Selector(`#${BUTTON_ID_1}`);

fixture('Session Handler usage').page('http://localhost:8080/');

test('When cookies are enabled, sessionManager records events using cookies', async (t: TestController) => {
    await t.wait(300);

    await t.click(randomSessionClickButton);

    await t.wait(300);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    await t
        .expect(REQUEST_BODY.textContent)
        .contains(SESSION_START_EVENT_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});

test('When cookie is disabled, sessionManager records events using member variables', async (t: TestController) => {
    await t.wait(300);

    await t.click(disallowCookiesClickButton);

    await t.wait(300);

    await t.click(randomSessionClickButton);

    await t.wait(300);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    await t
        .expect(REQUEST_BODY.textContent)
        .contains(SESSION_START_EVENT_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});

test('UserAgentMetaDataPlugin records user agent metadata', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t.wait(300);

    // click button
    await t.click(button1);
    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    // expect http request body contains user agent metadata
    // expect http response with mock status code 202
    await t
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_LANGUAGE)
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_NAME)
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_VERSION)
        .expect(REQUEST_BODY.textContent)
        .contains(OS_NAME)
        .expect(REQUEST_BODY.textContent)
        .contains(OS_VERSION)
        .expect(REQUEST_BODY.textContent)
        .contains(DEVICE_TYPE)
        .expect(REQUEST_BODY.textContent)
        .contains(PLATFORM_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});

test('When custom attribute set at init, custom attribute recorded in event metadata', async (t: TestController) => {
    await t.wait(300);

    await t.click(randomSessionClickButton);

    await t.wait(300);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    const events = JSON.parse(await REQUEST_BODY.textContent).RumEvents;

    const metaData = JSON.parse(events[0].metadata);

    await t
        .expect(metaData.customAttributeAtInit)
        .eql('customAttributeAtInitValue');
});

test('When custom attribute set at runtime, custom attribute recorded in event metadata', async (t: TestController) => {
    await t.wait(300);
    await t.click(addSessionAttributesButton1);
    await t.click(recordPageViewButtonOne);
    await t.click(addSessionAttributesButton2);
    await t.click(recordPageViewButtonTwo);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    const metadata = JSON.parse(await REQUEST_BODY.textContent)
        .RumEvents.filter((e) => e.type === PAGE_VIEW_EVENT_TYPE)
        .map((e: any) => JSON.parse(e.metadata));

    await t
        .expect(metadata.length)
        .eql(3)
        .expect(metadata[1].customPageAttributeAtRuntimeString)
        .eql('stringCustomAttributeAtRunTimeValue')
        .expect(metadata[2].customPageAttributeAtRuntimeString)
        .eql('stringCustomAttributeAtRunTimeValue')
        .expect(metadata[1].customPageAttributeAtRuntimeBoolean)
        .eql(true)
        .expect(metadata[2].customPageAttributeAtRuntimeBoolean)
        .eql(true)
        .expect(metadata[1].customPageAttributeAtRuntimeNumber)
        .eql(1)
        .expect(metadata[2].customPageAttributeAtRuntimeNumber)
        .eql(2);
});

test.only('When custom attribute set at runtime via callback, custom attribute recorded in event metadata', async (t: TestController) => {
    await t.wait(300);
    await t.click(addSessionAttributesButton1);
    await t.click(recordPageViewButtonOne);
    await t.click(addSessionAttributesCallbackButton);
    await t.click(recordPageViewButtonTwo);
    await t.click(recordPageViewButtonOne);
    await t.click(clearSessionAttributesCallbackButton);
    await t.click(recordPageViewButtonTwo);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    const metadata = JSON.parse(await REQUEST_BODY.textContent)
        .RumEvents.filter((e) => e.type === PAGE_VIEW_EVENT_TYPE)
        .map((e: any) => JSON.parse(e.metadata));

    // sanity check
    await t.expect(metadata.length).eql(5);

    // check hard coded page attributes
    await t
        .expect(metadata[1].customPageAttributeAtRuntimeString)
        .eql('stringCustomAttributeAtRunTimeValue')
        .expect(metadata[1].customPageAttributeAtRuntimeBoolean)
        .eql(true)
        .expect(metadata[1].customPageAttributeAtRuntimeNumber)
        .eql(1)
        .expect(metadata[1].customCount)
        .eql(undefined);

    // check dynamic overrides
    let prevCount = 0;
    await t
        // override
        .expect(
            (function () {
                prevCount = metadata[2].customPageAttributeAtRuntimeNumber;
                return prevCount;
            })()
        )
        .gt(10)
        .expect(metadata[2].customCount)
        .eql(prevCount)
        // other attributes not overridden
        .expect(metadata[2].customPageAttributeAtRuntimeString)
        .eql('stringCustomAttributeAtRunTimeValue')
        .expect(metadata[2].customPageAttributeAtRuntimeBoolean)
        .eql(true)
        .expect(metadata[3].customPageAttributeAtRuntimeNumber)
        .gt(prevCount);

    // check clear callback
    await t
        .expect(metadata[4].customPageAttributeAtRuntimeString)
        .eql('stringCustomAttributeAtRunTimeValue')
        .expect(metadata[4].customPageAttributeAtRuntimeBoolean)
        .eql(true)
        .expect(metadata[4].customPageAttributeAtRuntimeNumber)
        .eql(1)
        .expect(metadata[4].customCount)
        .eql(undefined);
});
