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
  var TITLE = MODULE_NAME + '.CREATE_TO';

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
  ];
  var ORDER_STATUSES = [
    {id: 'A', name: 'pendingApproval', label: 'pendingApproval'},
    {id: 'B', name: 'pendingFulfillment', label: 'pendingFulfillment'},
    {id: 'C', name: 'cancelled', label: 'cancelled'},
    {id: 'D', name: 'partiallyFulfilled', label: 'partiallyFulfilled'},
    {id: 'E', name: 'pendingBillingPartFulfilled', label: 'pendingBillingPartFulfilled'},
    {id: 'F', name: 'pendingBilling', label: 'pendingBilling'},
    {id: 'G', name: 'fullyBilled', label: 'fullyBilled'},
    {id: 'H', name: 'closed', label: 'closed'},
    {id: 'I', name: 'undefined', label: 'undefined'},
  ];

  // TO Data
  var TOData = {
    trandate: '9/3/2019',
    subsidiary: '2', // BT Gold
    location: '445',
    transferlocation: '447',
    status: 'B',
    department: '11', // Merchandising
    items: [
      {item: '64712'}
    ]
  };

  // Create Transfer Order
  var transferOrderRecord = record.create({
    type: record.Type.TRANSFER_ORDER
  });

  Object.keys(TOData).forEach(function (field) {
    if (field === 'trandate') {
      transferOrderRecord.setText({fieldId: field, text: TOData[field]});
      return;
    }
    // Set Sublist Items
    if (field === 'items') {
      TOData[field].forEach(function (item, idx) {
        transferOrderRecord.insertLine({sublistId: 'item', line: idx});
        Object.keys(item).forEach(function (itemField) {
          transferOrderRecord.setSublistValue({
            sublistId: 'item',
            line: idx,
            fieldId: itemField,
            value: item[itemField]
          });
        });
      });
      return;
    }
    return transferOrderRecord.setValue({fieldId: field, value: TOData[field]});
  });

  // Save the record.
  var netsuiteTransferOrderId = transferOrderRecord.save({
    // enableSourcing: true,
    ignoreMandatoryFields: true
  });

  log.debug(TITLE + '.netsuiteTransferOrderId', netsuiteTransferOrderId);

});
