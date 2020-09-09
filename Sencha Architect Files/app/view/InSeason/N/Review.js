/*
 * File: app/view/InSeason/N/Review.js
 *
 * This file was generated by Sencha Architect version 4.2.1.
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

Ext.define('pagaf.view.InSeason.N.Review', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.inseason.n.review',

    requires: [
        'pagaf.view.InSeason.N.ManagementViewModel3',
        'Ext.button.Button'
    ],

    viewModel: {
        type: 'inseason.n.review'
    },
    id: 'isnm_review',
    layout: 'vbox',
    defaultListenerScope: true,

    items: [
        {
            xtype: 'button',
            scale: 'large',
            text: 'Next',
            listeners: {
                click: 'onButtonClick111'
            }
        }
    ],

    onButtonClick111: function(button, e, eOpts) {
        var t = Ext.getCmp('isnm_download');
        t.expand();
        t.setDisabled(false);
        t.setVisible(true);
        var t = Ext.getCmp('isnm_review');
        t.setDisabled(true);
        t.setVisible(false);
    }

});