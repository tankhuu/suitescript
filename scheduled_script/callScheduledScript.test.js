function callScript() {
  var scriptId = 'customscript_ss_fix_uncommitted_so';
  var deployId = 'customdeploy_ss_fix_uncommitted_so';
  var params = {
    custscript_uncommitted_sos: JSON.stringify([['37951', '3128427']])
  };
  var callResult = nlapiScheduleScript(scriptId, deployId, params);
  nlapiLogExecution("DEBUG", callResult);
}