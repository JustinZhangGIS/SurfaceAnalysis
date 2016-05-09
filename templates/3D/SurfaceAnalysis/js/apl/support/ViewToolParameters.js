/**
 *
 * ViewToolParameters
 *  - View tool parameters
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/22/2016 - 0.0.1 -
 * Modified:
 *
 */
define([
  "dojo/_base/declare",
  "dojo/Evented",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/dom-class",
  "dstore/Memory",
  "dstore/Trackable",
  "dgrid/OnDemandGrid",
  "dgrid/Selection",
  "dgrid/extensions/DijitRegistry",
  "put-selector/put",
  "dijit/form/NumberSpinner",
  "dijit/form/Select",
  "dijit/form/CheckBox",
  "dijit/ConfirmDialog"
], function (declare, Evented, lang, array, domClass,
             Memory, Trackable, OnDemandGrid, Selection, DijitRegistry, put,
             NumberSpinner, Select, CheckBox, ConfirmDialog) {

  // CLASS //
  var ViewToolParameters = declare([Evented], {

    // CLASS NAME //
    declaredClass: "ViewToolParameters",

    /**
     * CONSTRUCTOR
     */
    constructor: function (options) {
      declare.safeMixin(this, options);
      if(this.parametersList && this.containerNode) {
        this.initialize();
      }
    },

    /**
     *
     */
    initialize: function () {

      // PARAMETER STORE //
      this.parametersStore = new declare([Memory, Trackable])({
        idProperty: "parameter",
        data: this.parametersList
      });

      // CONVERT TO JSON //
      this.parametersStore.asAnalysisParameters = function () {
        var parameters = {};
        this.forEach(function (item) {
          parameters[item.parameter] = item.value;
        });
        return parameters;
      };

      // PARAMETER GRID //
      this.parametersGrid = new (declare([OnDemandGrid, DijitRegistry]))({
        className: "dgrid-autoheight",
        collection: this.parametersStore,
        columns: [
          {
            field: "label",
            label: "Name",
            sortable: false
          },
          {
            field: "value",
            label: "Value",
            sortable: false,
            renderCell: function (object, value, node) {
              domClass.toggle(node, "cant-edit", !object.canEdit);
              return put(node, "div", value);
            }
          }
        ]
      }, put(this.containerNode, "div"));
      this.parametersGrid.startup();

      this.parametersGrid.on(".dgrid-cell:click", function (evt) {
        var cell = this.parametersGrid.cell(evt);
        if(cell.column.field === "value") {
          var item = cell.row.data;

          var editor = null;
          if(item.canEdit) {
            switch (item.editorType) {
              case "Number":
                editor = new NumberSpinner({value: item.value, constraints: item.constraints});
                break;
              case "Choice":
                editor = new Select({
                  options: array.map(item.options, function (option) {
                    return lang.mixin({}, option, {selected: (item.value === option.value)});
                  }.bind(this))
                });
                break;
              case "Boolean":
                editor = new CheckBox({checked: item.value});
                break;
            }
          }

          if(editor) {
            editor.startup();

            var editContent = put("div");
            put(editContent, "span", lang.replace("{label}:  ", item));
            put(editContent, editor.domNode);

            var editDlg = new ConfirmDialog({
              title: "Edit Parameter",
              style: "width:450px",
              content: editContent
            });
            editDlg.on("execute", function (evt) {
              var valuePropertyName = (editor.declaredClass == "dijit.form.CheckBox") ? "checked" : "value";
              item.value = editor.get(valuePropertyName);
              this.parametersStore.put(item);
              this.emit("update", {});
            }.bind(this));
            editDlg.show();
          }
        }
      }.bind(this));

      return this.parametersStore.asAnalysisParameters();
    },

    /**
     *
     * @returns {*}
     */
    asAnalysisParameters: function () {
      if(this.parametersStore) {
        return this.parametersStore.asAnalysisParameters();
      } else {
        return {};
      }
    }

  });

  // VERSION //
  ViewToolParameters.version = "0.0.1";

  // RETURN CLASS //
  return ViewToolParameters;
});
  

