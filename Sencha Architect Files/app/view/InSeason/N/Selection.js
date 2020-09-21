/*
 * File: app/view/InSeason/N/Selection.js
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

Ext.define('pagaf.view.InSeason.N.Selection', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.inseason.n.selection',

    requires: [
        'pagaf.view.InSeason.N.ManagementViewModel5',
        'pagaf.view.pagafAppPanel',
        'Ext.button.Button',
        'Ext.panel.Panel'
    ],

    viewModel: {
        type: 'inseason.n.selection'
    },
    id: 'isnm_selection',
    width: '100%',
    defaultListenerScope: true,

    layout: {
        type: 'vbox',
        pack: 'center'
    },
    items: [
        {
            xtype: 'container',
            height: 40,
            margin: '',
            width: '95%',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'container',
                    flex: 1
                },
                {
                    xtype: 'button',
                    id: 'selectbtn',
                    scale: 'large',
                    text: 'Next',
                    listeners: {
                        click: 'onButtonClick'
                    }
                }
            ]
        },
        {
            xtype: 'pagafapppanel',
            height: '700px',
            maxHeight: 700,
            minHeight: 700,
            width: '100%',
            margins: '0 auto'
        }
    ],

    onButtonClick: function(button, e, eOpts) {
        var t = Ext.getCmp('isnm_selection');

        if(t.getTitle().search('3.') > -1){
            t.setTitle('1. Select field');

            Ext.getCmp("mainCardPanel").getLayout().setActiveItem('home');
            window.download();
            Ext.getCmp('selectbtn').setText('Next');
            window.loadView("FieldManagement");
        } else {
            window.setPre(0);
            Ext.getCmp('setPreInput').setValue(0);
            t.setDisabled(true);
            t.setVisible(false);
            t = Ext.getCmp('isnm_management');
            t.expand();
            t.setDisabled(false);
            t.setVisible(true);
        }


    }

});