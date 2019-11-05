require(['N/record', 'N/file', 'N/email', 'N/render'], function (record, file, email, render) {

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
  var TORecord = record.load({ type: record.Type.TRANSFER_ORDER, id: '4555345' });
  log.debug('TORecord: ', TORecord);

  // var options = {
  //   author: 447741,
  //   // recipients: 'e-com@btj.vn',
  //   recipients: 'tanktm@btj.vn',
  //   //cc: ['hattd@btj.vn', 'vyttt@btj.vn'],
  //   subject: 'E-com gọi hàng - Khách chưa TT',
  //   // body: 
  // };

  // var TO = {
  //   listener: '',
  //   sender: 'tanktm@btj.vn',
  //   receiver: 'hattd@btj.vn',
  //   from: 'Precita Hậu Giang',
  //   to: 'Precita Vivo Quận 7',
  //   number: 'TOBTG0016303',
  //   status: '',
  //   date: '',
  //   items: [
  //     {id, name, status}
  //   ]
  // };

  // var renderer = render.create();

  // // var htmlTemplateFile = file.load('SuiteScripts/precita-netsuitetemplates/sample.html');
  // var htmlTemplateFile = file.load('7019325');

  // renderer.templateContent = htmlTemplateFile.getContents();
  // renderer.addCustomDataSource({
  //   format: render.DataSource.OBJECT,
  //   alias: "content",
  //   data: TO
  // });

  // log.debug('renderer: ', renderer);
  // options.body = renderer.renderAsString();

  // log.debug('options.body: ', options.body);

  // var sendEmailResult = email.send(options);
  // log.debug('sendEmailResult: ', sendEmailResult);

});
