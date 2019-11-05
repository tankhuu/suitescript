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

  // CONSTANTS
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
  var IFData = {
    trandate: '9/3/2019',
    createdfrom: '3131255', // TO Internal Id
    items: [
      {item: '64712'}
    ]
  };

  // Create Transfer Order
  var itemFulfillmentRecord = record.create({
    type: record.Type.ITEM_FULFILLMENT,
    isDynamic: true
  });

  Object.keys(IFData).forEach(function (field) {
    if (field === 'trandate') {
      itemFulfillmentRecord.setText({fieldId: field, text: IFData[field]});
      return;
    }
    // Set Sublist Items
    if (field === 'items') {
      IFData[field].forEach(function (item, idx) {
        itemFulfillmentRecord.insertLine({sublistId: 'item', line: idx});
        Object.keys(item).forEach(function (itemField) {
          itemFulfillmentRecord.setSublistValue({
            sublistId: 'item',
            line: idx,
            fieldId: itemField,
            value: item[itemField]
          });
        });
      });
      return;
    }
    return itemFulfillmentRecord.setValue({fieldId: field, value: IFData[field]});
  });

  // Save the record.
  var itemFulfillmentRecordId = itemFulfillmentRecord.save({
    // enableSourcing: true,
    ignoreMandatoryFields: true
  });

  log.debug(TITLE + '.itemFulfillmentRecordId', itemFulfillmentRecordId);

});
