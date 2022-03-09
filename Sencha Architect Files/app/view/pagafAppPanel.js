/*
 * File: app/view/pagafAppPanel.js
 *
 * This file was generated by Sencha Architect
 * http://www.sencha.com/products/architect/
 *
 * This file requires use of the Ext JS 6.5.x Classic library, under independent license.
 * License of Sencha Architect does not include license for Ext JS 6.5.x Classic. For more
 * details see http://www.sencha.com/license or contact license@sencha.com.
 *
 * This file will be auto-generated each and everytime you save your project.
 *
 * Do NOT hand edit this file.
 */

Ext.define('pagaf.view.pagafAppPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.pagafapppanel',

    requires: [
        'pagaf.view.pagafAppWindowViewModel1'
    ],

    viewModel: {
        type: 'pagafapppanel'
    },
    flex: 1,
    height: '100%',
    id: 'pagafapppanel',
    width: '100%',
    defaultListenerScope: true,

    listeners: {
        beforerender: 'onPagafapppanelBeforeRender',
        beforeexpand: 'onPagafapppanelBeforeExpand'
    },

    onPagafapppanelBeforeRender: function(component, eOpts) {
        component.setHtml(
        '<div id="spinnerContainer" class="spinContainer"  aria-busy="true">' +
        '	<div class="loading-spinner"></div>' +
        '</div>' +
        '<div class="container">' +
        '	<!--<div id="topBar" class="topBar">' +
        '		<button id="logout" class="organization">Log Out</button>' +
        '		<button id="organization" class="organization"></button>' +
        '	</div>-->' +
        '	<div id="bar2" class="bar2"></div>' +
        '	<div id="selectedFields" class="fieldBox">' +
        '	</div>' +
        '	<div id="mapContainer" class="mapContainer">' +
        '		<div id="map" class="map">' +
        '			<div id="drawing" class="drawingContainer">' +
        '				<p class="instructions">Draw fields on the map with drawing tools. When done, click the next button.</p>' +
        '				<button class="saveButton">Save Polygons</button>' +
        '				<button class="editButton">Edit Polygons</button>' +
        '			</div>' +
        '			' +
        '			<div id="tiles" class="tiles"></div>' +
        '			<button class="layerButton stepClassed">Layer visibility</button>' +
        '		</div>' +
        '	</div>' +
        '	<div id="modelContainer" class="modelContainer">' +
        '		<p class="instructionsRel">Click a field outline to adjust model for that field. When done, click the download button.</p>' +
        '		<div class="sliderContainer"></div>' +
        '		<div id="mapOutput" class="mapOutput"></div>' +
        '		<img id="testImage">' +
        '		<canvas class="hidden" id="testCanvas"></canvas>' +
        '		<canvas class="hidden" id="clipCanvas"></canvas>' +
        '		<div id="webglContainer" class="webglContainer hidden">' +
        '			<canvas id="webglCanvas" style="display:none;"></canvas>' +
        '			<p class="barTitle">Napp ranges from 0 to 250 kg/ha</p>' +
        '			<canvas id="colorCanvas"></canvas>' +
        '			<svg id="eonrSlider" class="slider" width="250" height="40"></svg>' +
        '			<svg id="mSlider" class="slider" width="250" height="40"></svg>' +
        '			<svg id="sithreshSlider" class="slider" width="250" height="40"></svg>' +
        '			<canvas id="webglCanvasEncoded" style="display:inline-block;" class="hidden"></canvas>' +
        '		</div>' +
        '	</div>' +
        '</div>');
    },

    onPagafapppanelBeforeExpand: function(p, animate, eOpts) {

    }

});