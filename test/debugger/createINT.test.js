require(['N/record'], function (record) {

  /**
   * Module Description...
   *
   * @exports XXX
   *
   * @copyright 2018 ${organization}
   * @author ${author} <${email}>
   *
   * @NApiVersion 2.0
   */
  var MODULE_NAME = 'DEBUGGER';
  var TITLE = MODULE_NAME + '.CREATE_INVENTORY_TRANSFER';

  // CONST
  var SUBSIDIARIES = [
    {id: '2', name: 'BT Gold', label: 'BT Gold'}
  ];
  var DEPARTMENTS = [
    {id: '11', name: 'Merchandising', label: 'Merchandising'}
  ];
  var LOCATIONS = [
    {id: '445', name: 'Ba Thang Hai', label: 'Ba Thang Hai'},
    {id: '447', name: 'E-Commerce', label: 'E-Commerce'},
    {id: '486', name: 'Co.opMart Xa Lo Ha Noi', label: 'Co.opMart Xa Lo Ha Noi'},
  ];

  // INVENTORY TRANSFER Data
  var INTData = {
    trandate: '8/3/2019',
    location: '486',
    transferlocation: '447',
    memo: 'fix Underwater',
    subsidiary: '2', // BT Gold
    department: '11', // Merchandising
    inventory: [
      {item: '10063', adjustqtyby: '1'}
    ]
  };

  var data = [{
    "trandate": "13/03/2019",
    "subsidiary": "2",
    "department": "11",
    "location": "445",
    "transferlocation": "447",
    "memo": "FIX_UNCOMMITTED_SO",
    "inventory": [{"item": "2511", "adjustqtyby": "1"}]
  }]

  // Create Transfer Order
  var inventoryTransferRecord = record.create({
    type: record.Type.INVENTORY_TRANSFER,
    isDynamic: false
  });

  // We have to set the subsidiary first for setting the location
  inventoryTransferRecord.setValue({fieldId: 'subsidiary', value: INTData.subsidiary});

  Object.keys(INTData).forEach(function (field) {
    if (field === 'subsidiary') return;
    if (field === 'trandate') {
      inventoryTransferRecord.setText({fieldId: field, text: INTData[field]});
      return;
    }
    // Set Sublist Items
    if (field === 'inventory') {
      INTData[field].forEach(function (item, idx) {
        inventoryTransferRecord.insertLine({sublistId: field, line: idx});
        Object.keys(item).forEach(function (itemField) {
          inventoryTransferRecord.setSublistValue({
            sublistId: field,
            line: idx,
            fieldId: itemField,
            value: item[itemField]
          });
        });
      });
      return;
    }
    return inventoryTransferRecord.setValue({fieldId: field, value: INTData[field]});
  });

  log.debug(TITLE + '.inventoryTransferRecord', inventoryTransferRecord);
  // Save the record.
  var inventoryTransferId = inventoryTransferRecord.save({
    // enableSourcing: true,
    ignoreMandatoryFields: true
  });

  log.debug(TITLE + '.inventoryTransferId', inventoryTransferId);

});
