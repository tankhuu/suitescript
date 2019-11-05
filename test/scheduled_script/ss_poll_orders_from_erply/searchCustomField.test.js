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
  var TITLE = 'searchCustomField';
  var rs = nlapiSearchRecord('customrecord_getorder_script_exec', null, null, new nlobjSearchColumn('custrecord_getorder_script_exec'));

  var getLastRuntime = search.create({
    type: 'customrecord_getorder_script_exec',
    columns: [{
      name: 'custrecord_getorder_script_exec'
    }]
  });

  getLastRuntime.run().each(function (result) {
    log.debug(TITLE+'.customrecord_getorder_script_exec', result.)
  });

  return rs[0].getValue('custrecord_getorder_script_exec');
});
