require(['N/search'], function (search) {

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

  var items = ['200019R056W4CAA_0002', '100001D001W0002_0001'];
  var itemNames = items.map(function(name) {
    return "'" + name + "'";
  });
  var formula = "formulanumeric: case when {name} in (" + itemNames.join() + ") then 1 else 0 end";
  log.debug('formula: ', formula);
  var filter1 = [formula.toString(), "equalto", "1"]
  var filter2 = ['locationquantityonhand', 'greaterthan', '0'];
  var filter3 = ['locationquantityintransit', 'greaterthan', '0'];

  var resultColumns = ['internalid', 'inventorylocation', 'name', 'custitem_btj_last_transfered_date'];

  var searchFilters = [filter1, 'and', [filter2, 'or', filter3]];
  var itemsSearch = search.create({
    type: search.Type.INVENTORY_ITEM,
    columns: resultColumns,
    filters: searchFilters
  });
  log.debug(TITLE + '.itemsSearch', itemsSearch);
  itemsSearch.run().each(function (item) {
    log.debug(TITLE + '.item', item);
    return true;
  });
});
