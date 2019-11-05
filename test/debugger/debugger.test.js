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
  var TITLE = 'DEBUGGER';

  var itemRecord = record.load({ type: record.Type.INVENTORY_ITEM, id: 103642 });
  itemRecord.setValue({fieldId: 'custitem_btj_website_sync_status', value: 'NOT_SYNCED'});
  itemRecord.save();
  log.debug('rec: ', itemRecord)

});
