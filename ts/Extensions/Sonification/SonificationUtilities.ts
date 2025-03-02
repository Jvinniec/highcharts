/* *
 *
 *  (c) 2009-2021 Øystein Moseng
 *
 *  Utility functions for sonification.
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type Chart from '../../Core/Chart/Chart';
import type {
    DefaultSonificationInstrumentOptions,
    SonificationInstrumentOptions
} from './SonificationOptions';
import type Point from '../../Core/Series/Point';
import type PointSonify from './PointSonify';
import type RangeSelector from '../RangeSelector';
import type Series from '../../Core/Series/Series';

import MusicalFrequencies from './MusicalFrequencies.js';
import SignalHandler from './SignalHandler.js';
import U from '../../Core/Utilities.js';
const {
    clamp,
    merge
} = U;

/* eslint-disable no-invalid-this, valid-jsdoc */

/* *
 *
 *  Constants
 *
 * */

const SonificationUtilities = {

    // List of musical frequencies from C0 to C8
    musicalFrequencies: MusicalFrequencies,

    // SignalHandler class
    SignalHandler: SignalHandler as any,

    getExtremesForInstrumentProps,

    /**
     * Get a musical scale by specifying the semitones from 1-12 to include.
     *  1: C, 2: C#, 3: D, 4: D#, 5: E, 6: F,
     *  7: F#, 8: G, 9: G#, 10: A, 11: Bb, 12: B
     * @private
     * @param {Array<number>} semitones
     * Array of semitones from 1-12 to include in the scale. Duplicate entries
     * are ignored.
     * @return {Array<number>}
     * Array of frequencies from C0 to C8 that are included in this scale.
     */
    getMusicalScale: function (semitones: Array<number>): Array<number> {
        return MusicalFrequencies.filter(function (
            freq: number,
            i: number
        ): boolean {
            const interval = i % 12 + 1;

            return semitones.some(function (
                allowedInterval: number
            ): boolean {
                return allowedInterval === interval;
            });
        });
    },

    /**
     * Calculate the extreme values in a chart for a data prop.
     * @private
     * @param {Highcharts.Chart} chart - The chart
     * @param {string} prop - The data prop to find extremes for
     * @return {Highcharts.RangeObject} Object with min and max properties
     */
    calculateDataExtremes: function (
        chart: Chart,
        prop: string
    ): RangeSelector.RangeObject {
        return chart.series.reduce(function (
            extremes: RangeSelector.RangeObject,
            series: Series
        ): RangeSelector.RangeObject {
            // We use cropped points rather than series.data here, to allow
            // users to zoom in for better fidelity.
            series.points.forEach(function (point: Point): void {
                const val = typeof (point as any)[prop] !== 'undefined' ?
                    (point as any)[prop] : (point.options as any)[prop];

                extremes.min = Math.min(extremes.min, val);
                extremes.max = Math.max(extremes.max, val);
            });
            return extremes;
        }, {
            min: Infinity,
            max: -Infinity
        });
    },

    /**
     * Translate a value on a virtual axis. Creates a new, virtual, axis with a
     * min and max, and maps the relative value onto this axis.
     * @private
     * @param {number} value
     * The relative data value to translate.
     * @param {Highcharts.RangeObject} DataExtremesObject
     * The possible extremes for this value.
     * @param {object} limits
     * Limits for the virtual axis.
     * @param {boolean} [invert]
     * Invert the virtual axis.
     * @return {number}
     * The value mapped to the virtual axis.
     */
    virtualAxisTranslate: function (
        value: number,
        dataExtremes: RangeSelector.RangeObject,
        limits: RangeSelector.RangeObject,
        invert?: boolean
    ): number {
        const lenValueAxis = dataExtremes.max - dataExtremes.min,
            lenVirtualAxis = Math.abs(limits.max - limits.min),
            valueDelta = invert ?
                dataExtremes.max - value :
                value - dataExtremes.min,
            virtualValueDelta = lenVirtualAxis * valueDelta / lenValueAxis,
            virtualAxisValue = limits.min + virtualValueDelta;

        return lenValueAxis > 0 ?
            clamp(virtualAxisValue, limits.min, limits.max) :
            limits.min;
    }
};

/* *
 *
 *  Functions
 *
 * */

/**
 * Calculate value extremes for used instrument data properties on a chart.
 * @private
 * @param {Highcharts.Chart} chart
 * The chart to calculate extremes from.
 * @param {Array<Highcharts.PointInstrumentObject>} [instruments]
 * Additional instrument definitions to inspect for data props used, in
 * addition to the instruments defined in the chart options.
 * @param {Highcharts.Dictionary<Highcharts.RangeObject>} [dataExtremes]
 * Predefined extremes for each data prop.
 * @return {Highcharts.Dictionary<Highcharts.RangeObject>}
 * New extremes with data properties mapped to min/max objects.
 */
function getExtremesForInstrumentProps(
    chart: Chart,
    instruments?: Array<PointSonify.PointInstrument>,
    dataExtremes?: Record<string, RangeSelector.RangeObject>
): Record<string, RangeSelector.RangeObject> {
    const defaultInstrumentDef = (
            chart.options.sonification &&
            chart.options.sonification.defaultInstrumentOptions
        ),
        optionDefToInstrDef = (
            optionDef: SonificationInstrumentOptions|DefaultSonificationInstrumentOptions
        ): PointSonify.PointInstrument => ({
            instrumentMapping: optionDef.mapping
        } as PointSonify.PointInstrument);
    let allInstrumentDefinitions = (instruments || []).slice(0);

    if (defaultInstrumentDef) {
        allInstrumentDefinitions.push(optionDefToInstrDef(defaultInstrumentDef));
    }

    chart.series.forEach((series): void => {
        const instrOptions = (
            series.options.sonification &&
            series.options.sonification.instruments
        );
        if (instrOptions) {
            allInstrumentDefinitions = allInstrumentDefinitions.concat(instrOptions.map(optionDefToInstrDef));
        }
    });

    return (allInstrumentDefinitions).reduce(function (
        newExtremes: Record<string, RangeSelector.RangeObject>,
        instrumentDefinition: PointSonify.PointInstrument
    ): Record<string, RangeSelector.RangeObject> {
        Object.keys(instrumentDefinition.instrumentMapping || {}).forEach(
            function (instrumentParameter: string): void {
                const value = instrumentDefinition.instrumentMapping[
                    instrumentParameter
                ];

                if (typeof value === 'string' && !newExtremes[value]) {
                    // This instrument parameter is mapped to a data prop.
                    // If we don't have predefined data extremes, find them.
                    newExtremes[value] = SonificationUtilities.calculateDataExtremes(
                        chart, value
                    );
                }
            }
        );
        return newExtremes;
    }, merge(dataExtremes));
}

/* *
 *
 *  Default export
 *
 * */

export default SonificationUtilities;
