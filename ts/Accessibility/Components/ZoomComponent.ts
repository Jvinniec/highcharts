/* *
 *
 *  (c) 2009-2021 Øystein Moseng
 *
 *  Accessibility component for chart zoom.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

import type Chart from '../../Core/Chart/Chart';
import type {
    DOMElementType,
    SVGDOMElement
} from '../../Core/Renderer/DOMElementType';
import type SVGElement from '../../Core/Renderer/SVG/SVGElement';
import type ProxyElement from '../ProxyElement';

import AccessibilityComponent from '../AccessibilityComponent.js';
import ChartUtilities from '../Utils/ChartUtilities.js';
const {
    unhideChartElementFromAT
} = ChartUtilities;
import H from '../../Core/Globals.js';
const {
    noop
} = H;
import KeyboardNavigationHandler from '../KeyboardNavigationHandler.js';
import U from '../../Core/Utilities.js';
const {
    attr,
    extend,
    pick
} = U;

declare module '../../Core/Axis/AxisLike' {
    interface AxisLike {
        /** @requires modules/accessibility */
        panStep(direction: number, granularity?: number): void;
    }
}

/**
 * Internal types.
 * @private
 */
declare global {
    namespace Highcharts {
        class ZoomComponent extends AccessibilityComponent {
            public constructor();
            public drillUpProxyButton?: ProxyElement;
            public resetZoomProxyButton?: ProxyElement;
            public focusedMapNavButtonIx: number;
            getKeyboardNavigation(): Array<KeyboardNavigationHandler>;
            getMapZoomNavigation(): KeyboardNavigationHandler;
            init(): void;
            createZoomProxyButton(
                buttonEl: SVGElement,
                buttonProp: ('drillUpProxyButton'|'resetZoomProxyButton'),
                label: string
            ): void;
            onChartRender(): void;
            onChartUpdate(): void;
            onMapKbdArrow(
                keyboardNavigationHandler: KeyboardNavigationHandler,
                keyCode: number
            ): number;
            onMapKbdClick(
                keyboardNavigationHandler: KeyboardNavigationHandler
            ): number;
            onMapNavInit(direction: number): void;
            onMapKbdTab(
                keyboardNavigationHandler: KeyboardNavigationHandler,
                event: Event
            ): number;
            setMapNavButtonAttrs(
                button: DOMElementType,
                labelFormatKey: string
            ): void;
            simpleButtonNavigation(
                buttonProp: string,
                proxyProp: string,
                onClick: Function
            ): KeyboardNavigationHandler;
            updateProxyOverlays(): void;
        }
    }
}


/* eslint-disable no-invalid-this, valid-jsdoc */

/**
 * @private
 */
function chartHasMapZoom(
    chart: Highcharts.MapNavigationChart
): boolean {
    return !!(
        chart.mapZoom &&
        chart.mapNavButtons &&
        chart.mapNavButtons.length
    );
}


/**
 * Pan along axis in a direction (1 or -1), optionally with a defined
 * granularity (number of steps it takes to walk across current view)
 *
 * @private
 * @function Highcharts.Axis#panStep
 *
 * @param {number} direction
 * @param {number} [granularity]
 */
(H as any).Axis.prototype.panStep = function (
    direction: number,
    granularity?: number
): void {
    const gran = granularity || 3;
    const extremes = this.getExtremes();
    const step = (extremes.max - extremes.min) / gran * direction;
    let newMax = extremes.max + step;
    let newMin = extremes.min + step;
    const size = newMax - newMin;

    if (direction < 0 && newMin < extremes.dataMin) {
        newMin = extremes.dataMin;
        newMax = newMin + size;
    } else if (direction > 0 && newMax > extremes.dataMax) {
        newMax = extremes.dataMax;
        newMin = newMax - size;
    }
    this.setExtremes(newMin, newMax);
};


/**
 * The ZoomComponent class
 *
 * @private
 * @class
 * @name Highcharts.ZoomComponent
 */
const ZoomComponent: typeof Highcharts.ZoomComponent = noop as any;
ZoomComponent.prototype = new (AccessibilityComponent as any)();
extend(ZoomComponent.prototype, /** @lends Highcharts.ZoomComponent */ {

    /**
     * Initialize the component
     */
    init: function (this: Highcharts.ZoomComponent): void {
        const component = this,
            chart = this.chart;

        this.proxyProvider.addGroup('zoom', 'div');

        [
            'afterShowResetZoom', 'afterDrilldown', 'drillupall'
        ].forEach(function (eventType: string): void {
            component.addEvent(chart, eventType, function (): void {
                component.updateProxyOverlays();
            });
        });
    },


    /**
     * Called when chart is updated
     */
    onChartUpdate: function (this: Highcharts.ZoomComponent): void {
        const chart = this.chart,
            component = this;

        // Make map zoom buttons accessible
        if (chart.mapNavButtons) {
            chart.mapNavButtons.forEach(function (
                button: SVGElement,
                i: number
            ): void {
                unhideChartElementFromAT(chart, button.element);
                component.setMapNavButtonAttrs(
                    button.element,
                    'accessibility.zoom.mapZoom' + (i ? 'Out' : 'In')
                );
            });
        }
    },


    /**
     * @private
     * @param {Highcharts.HTMLDOMElement|Highcharts.SVGDOMElement} button
     * @param {string} labelFormatKey
     */
    setMapNavButtonAttrs: function (
        this: Highcharts.ZoomComponent,
        button: DOMElementType,
        labelFormatKey: string
    ): void {
        const chart = this.chart,
            label = chart.langFormat(
                labelFormatKey,
                { chart: chart }
            );

        attr(button, {
            tabindex: -1,
            role: 'button',
            'aria-label': label
        });
    },


    /**
     * Update the proxy overlays on every new render to ensure positions are
     * correct.
     */
    onChartRender: function (this: Highcharts.ZoomComponent): void {
        this.updateProxyOverlays();
    },


    /**
     * Update proxy overlays, recreating the buttons.
     */
    updateProxyOverlays: function (this: Highcharts.ZoomComponent): void {
        const chart = this.chart;

        // Always start with a clean slate
        this.proxyProvider.clearGroup('zoom');

        if (chart.resetZoomButton) {
            this.createZoomProxyButton(
                chart.resetZoomButton, 'resetZoomProxyButton',
                chart.langFormat(
                    'accessibility.zoom.resetZoomButton',
                    { chart: chart }
                )
            );
        }

        if (chart.drillUpButton) {
            this.createZoomProxyButton(
                chart.drillUpButton, 'drillUpProxyButton',
                chart.langFormat(
                    'accessibility.drillUpButton',
                    {
                        chart: chart,
                        buttonText: chart.getDrilldownBackText()
                    }
                )
            );
        }
    },


    /**
     * @private
     * @param {Highcharts.SVGElement} buttonEl
     * @param {string} buttonProp
     * @param {string} label
     */
    createZoomProxyButton: function (
        this: Highcharts.ZoomComponent,
        buttonEl: SVGElement,
        buttonProp: ('drillUpProxyButton'|'resetZoomProxyButton'),
        label: string
    ): void {
        this[buttonProp] = this.proxyProvider.addProxyElement('zoom', {
            click: buttonEl
        }, {
            'aria-label': label,
            tabindex: -1
        });
    },


    /**
     * Get keyboard navigation handler for map zoom.
     * @private
     * @return {Highcharts.KeyboardNavigationHandler} The module object
     */
    getMapZoomNavigation: function (
        this: Highcharts.ZoomComponent
    ): KeyboardNavigationHandler {
        const keys = this.keyCodes,
            chart = this.chart,
            component = this;

        return new (KeyboardNavigationHandler as any)(chart, {
            keyCodeMap: [
                [
                    [keys.up, keys.down, keys.left, keys.right],
                    function (
                        this: KeyboardNavigationHandler,
                        keyCode: number
                    ): number {
                        return component.onMapKbdArrow(this, keyCode);
                    }
                ],
                [
                    [keys.tab],
                    function (
                        this: KeyboardNavigationHandler,
                        _keyCode: number,
                        e: KeyboardEvent
                    ): number {
                        return component.onMapKbdTab(this, e);
                    }
                ],
                [
                    [keys.space, keys.enter],
                    function (
                        this: KeyboardNavigationHandler
                    ): number {
                        return component.onMapKbdClick(this);
                    }
                ]
            ],

            validate: function (): boolean {
                return chartHasMapZoom(chart as any);
            },

            init: function (direction: number): void {
                return component.onMapNavInit(direction);
            }
        });
    },


    /**
     * @private
     * @param {Highcharts.KeyboardNavigationHandler} keyboardNavigationHandler
     * @param {number} keyCode
     * @return {number} Response code
     */
    onMapKbdArrow: function (
        this: Highcharts.ZoomComponent,
        keyboardNavigationHandler: KeyboardNavigationHandler,
        keyCode: number
    ): number {
        const keys = this.keyCodes,
            panAxis: ('xAxis'|'yAxis') =
                (keyCode === keys.up || keyCode === keys.down) ?
                    'yAxis' : 'xAxis',
            stepDirection = (keyCode === keys.left || keyCode === keys.up) ?
                -1 : 1;

        this.chart[panAxis][0].panStep(stepDirection);

        return keyboardNavigationHandler.response.success;
    },


    /**
     * @private
     * @param {Highcharts.KeyboardNavigationHandler} keyboardNavigationHandler
     * @param {global.KeyboardEvent} event
     * @return {number} Response code
     */
    onMapKbdTab: function (
        this: Highcharts.ZoomComponent,
        keyboardNavigationHandler: KeyboardNavigationHandler,
        event: KeyboardEvent
    ): number {
        const chart: Highcharts.MapNavigationChart = this.chart as Highcharts.MapNavigationChart;
        const response = keyboardNavigationHandler.response;
        const isBackwards = event.shiftKey;
        const isMoveOutOfRange = isBackwards && !this.focusedMapNavButtonIx ||
                !isBackwards && this.focusedMapNavButtonIx;

        // Deselect old
        chart.mapNavButtons[this.focusedMapNavButtonIx].setState(0);

        if (isMoveOutOfRange) {
            chart.mapZoom(); // Reset zoom
            return response[isBackwards ? 'prev' : 'next'];
        }

        // Select other button
        this.focusedMapNavButtonIx += isBackwards ? -1 : 1;
        const button = chart.mapNavButtons[this.focusedMapNavButtonIx];
        chart.setFocusToElement(button.box, button.element);
        button.setState(2);

        return response.success;
    },


    /**
     * @private
     * @param {Highcharts.KeyboardNavigationHandler} keyboardNavigationHandler
     * @return {number} Response code
     */
    onMapKbdClick: function (
        this: Highcharts.ZoomComponent,
        keyboardNavigationHandler: KeyboardNavigationHandler
    ): number {
        const el: SVGDOMElement = (this.chart as any).mapNavButtons[this.focusedMapNavButtonIx].element;
        this.fakeClickEvent(el);
        return keyboardNavigationHandler.response.success;
    },


    /**
     * @private
     * @param {number} direction
     */
    onMapNavInit: function (
        this: Highcharts.ZoomComponent,
        direction: number
    ): void {
        const chart: Highcharts.MapNavigationChart = this.chart as any,
            zoomIn = chart.mapNavButtons[0],
            zoomOut = chart.mapNavButtons[1],
            initialButton = direction > 0 ? zoomIn : zoomOut;

        chart.setFocusToElement(initialButton.box, initialButton.element);
        initialButton.setState(2);

        this.focusedMapNavButtonIx = direction > 0 ? 0 : 1;
    },


    /**
     * Get keyboard navigation handler for a simple chart button. Provide the
     * button reference for the chart, and a function to call on click.
     *
     * @private
     * @param {string} buttonProp The property on chart referencing the button.
     * @return {Highcharts.KeyboardNavigationHandler} The module object
     */
    simpleButtonNavigation: function (
        this: Highcharts.ZoomComponent,
        buttonProp: string,
        proxyProp: string,
        onClick: Function
    ): KeyboardNavigationHandler {
        const keys = this.keyCodes,
            component = this,
            chart = this.chart;

        return new (KeyboardNavigationHandler as any)(chart, {
            keyCodeMap: [
                [
                    [keys.tab, keys.up, keys.down, keys.left, keys.right],
                    function (
                        this: KeyboardNavigationHandler,
                        keyCode: number,
                        e: KeyboardEvent
                    ): number {
                        const isBackwards = keyCode === keys.tab && e.shiftKey ||
                            keyCode === keys.left || keyCode === keys.up;

                        // Arrow/tab => just move
                        return this.response[isBackwards ? 'prev' : 'next'];
                    }
                ],
                [
                    [keys.space, keys.enter],
                    function (
                        this: KeyboardNavigationHandler
                    ): void {
                        const res = onClick(this, chart);
                        return pick(res, this.response.success);
                    }
                ]
            ],

            validate: function (): boolean {
                const hasButton = (
                    (chart as any)[buttonProp] &&
                    (chart as any)[buttonProp].box &&
                    (component as any)[proxyProp].buttonElement
                );
                return hasButton;
            },

            init: function (): void {
                chart.setFocusToElement(
                    (chart as any)[buttonProp].box,
                    (component as any)[proxyProp].buttonElement
                );
            }
        });
    },


    /**
     * Get keyboard navigation handlers for this component.
     * @return {Array<Highcharts.KeyboardNavigationHandler>}
     *         List of module objects
     */
    getKeyboardNavigation: function (
        this: Highcharts.ZoomComponent
    ): Array<KeyboardNavigationHandler> {
        return [
            this.simpleButtonNavigation(
                'resetZoomButton',
                'resetZoomProxyButton',
                function (
                    _handler: KeyboardNavigationHandler,
                    chart: Chart
                ): void {
                    chart.zoomOut();
                }
            ),
            this.simpleButtonNavigation(
                'drillUpButton',
                'drillUpProxyButton',
                function (
                    handler: KeyboardNavigationHandler,
                    chart: Chart
                ): number {
                    chart.drillUp();
                    return handler.response.prev;
                }
            ),
            this.getMapZoomNavigation()
        ];
    }

});

export default ZoomComponent;
