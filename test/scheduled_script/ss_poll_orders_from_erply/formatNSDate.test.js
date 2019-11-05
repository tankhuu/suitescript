require(['N/format'], function (format) {

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
  var TITLE = 'formatNSDate';
  var date = '2018-06-27';
  var dateSplitted = date.split('-');
  var year = dateSplitted[0];
  var month = dateSplitted[1];
  var day = dateSplitted[2];
  var dateFormatted = format.format({
    value: [day, month, year].join('/'),
    type: format.Type.DATE
  })
  log.debug(TITLE + '.dateFormatted.type', util.isDate(dateFormatted));
  log.debug(TITLE + '.dateFormatted', dateFormatted);
});
