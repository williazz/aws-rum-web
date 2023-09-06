import {
    navigationEvent,
    performanceEvent,
    performanceEventNotLoaded,
    mockPerformanceObserver,
    MockPerformanceTiming,
    mockPerformanceObjectWith,
    putRumEventsDocument,
    parsedRumEvent
} from '../../../test-utils/mock-data';
import { NavigationPlugin } from '../NavigationPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../utils/constant';
import { PartialPerformancePluginConfig } from 'plugins/utils/performance-utils';
import { RecordEvent } from 'plugins/types';

const buildNavigationPlugin = (config?: PartialPerformancePluginConfig) => {
    return new NavigationPlugin(config);
};

describe('NavigationPlugin tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When navigation event is present then event is recorded', async () => {
        const plugin: NavigationPlugin = buildNavigationPlugin();
        // Run
        const record: jest.MockedFunction<RecordEvent> = jest
            .fn()
            .mockReturnValue({ ...parsedRumEvent });
        const mockContext = {
            ...context,
            record
        };
        plugin.load(mockContext);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );
        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                duration: navigationEvent.duration,
                startTime: navigationEvent.startTime,
                navigationType: navigationEvent.type
            })
        );
        expect(context.bus.dispatch).toHaveBeenCalledTimes(1); // eslint-disable-line
    });

    test('When navigation timing level 2 API is not present then navigation timing level 1 API is recorded', async () => {
        jest.useFakeTimers();
        mockPerformanceObjectWith([putRumEventsDocument], [], []);
        mockPerformanceObserver();

        const plugin: NavigationPlugin = buildNavigationPlugin();
        const record: jest.MockedFunction<RecordEvent> = jest
            .fn()
            .mockReturnValue({ ...parsedRumEvent });
        const mockContext = {
            ...context,
            record
        };
        plugin.load(mockContext);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        jest.runAllTimers();

        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(
            PERFORMANCE_NAVIGATION_EVENT_TYPE
        );

        expect(record.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                domComplete:
                    MockPerformanceTiming.domComplete -
                    MockPerformanceTiming.navigationStart,
                responseStart:
                    MockPerformanceTiming.responseStart -
                    MockPerformanceTiming.navigationStart,
                initiatorType: 'navigation',
                redirectStart: MockPerformanceTiming.redirectStart,
                navigationTimingLevel: 1
            })
        );
        expect(context.bus.dispatch).toHaveBeenCalledTimes(1); // eslint-disable-line
    });

    test('when enabled then events are recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalled();
    });

    test('when disabled then no events are recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        // window has already loaded, so it will fire when we load.
        // thus disabling the plugin before we load
        plugin.disable();
        plugin.load(context);

        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });
    test('when entry is ignored then level 2 navigation is not recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin({
            ignore: (event) => true
        });

        plugin.load(context);
        window.dispatchEvent(new Event('load'));
        plugin.disable();

        // Assert
        expect(record).not.toHaveBeenCalled();
    });

    test('when window.load fires after plugin loads then navigation timing is recorded', async () => {
        // Setting up new mocked window that has not loaded
        (window as any).performance = performanceEventNotLoaded.performance();

        // enables plugin by default and loads
        const plugin: NavigationPlugin = buildNavigationPlugin();
        plugin.load(context);
        // assert that the plugin did not fire
        expect(record).toHaveBeenCalledTimes(0);

        // now that the page has loaded, we should fire
        window.dispatchEvent(new Event('load'));
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when window.load fires before plugin loads then navigation timing is recorded', async () => {
        // enables plugin by default
        const plugin: NavigationPlugin = buildNavigationPlugin();

        // window by default has already loaded before the plugin
        // so when we load the plugin now, it should still record event
        plugin.load(context);
        // Assert
        expect(record).toHaveBeenCalled();
    });
});
