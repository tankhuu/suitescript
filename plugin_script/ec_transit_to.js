var MODULE_NAME = 'EMAIL_CAPTURE_TRANSIT_TO';

function process(email) {
  try {
    var LOG_TITLE = MODULE_NAME + '.process';
    var emailProperties = extractPropertiesFromBody(email);
    nlapiLogExecution('AUDIT', 'extractPropertiesFromBody', JSON.stringify(emailProperties));

    var from = email.getFrom();
    nlapiLogExecution('AUDIT', '.email.from', from);
    var subjectContent = email.getSubject().split(' ');
    nlapiLogExecution('AUDIT', '.email.subject', subjectContent);
    var action = subjectContent[0];
    var id = subjectContent[subjectContent.length - 1];

    if (action && id) {
      switch (action) {
        case 'Transit': {
          var data = {
            transferStock: {
              transfer_order_id: id,
              items: emailProperties.itemNumbers
            }
          }
          // nlapiLogExecution('DEBUG', 'data', JSON.stringify(data));
          // Authentication Information
          // Production
          var token = 'Bearer MAGENTO_API_TOKEN';
          var url = "https://domain.vn/rest/V1/orderManagement/updateTOInTransitStatus";

          var headers = {
            "User-Agent-x": "SuiteScript-Call",
            "Authorization": token,
            "Content-Type": "application/json"
          };
          var httpMethod = 'POST';
          nlapiLogExecution('DEBUG', LOG_TITLE + '.request', url);
          nlapiLogExecution('DEBUG', LOG_TITLE + '.request', JSON.stringify(headers));
          nlapiLogExecution('DEBUG', LOG_TITLE + '.request', JSON.stringify(data));
          var response = nlapiRequestURL(url, JSON.stringify(data), headers, httpMethod);
          if (response) {
            if (response.getCode() !== 200) {
              throw Error(LOG_TITLE + '.failed: ' + JSON.stringify(response));
            }
            nlapiLogExecution('DEBUG', LOG_TITLE + '.response', response);
            break;
          }

          break;
        }
        default: {
          throw Error(LOG_TITLE + '.action: ' + action + ' is unsupported!!');
        }
      }
    }
  } catch (err) {
    throw Error(LOG_TITLE + err.message);
  }
}


function extractPropertiesFromBody(email) {
  // nlapiLogExecution('AUDIT', 'extractPropertiesFromBody');
  var htmlBody = email.getHtmlBody();
  // nlapiLogExecution('DEBUG', 'htmlBody', htmlBody);
  if (!htmlBody) {
    htmlBody = email.getTextBody();
    // nlapiLogExecution('DEBUG', 'textBody', htmlBody);
  }
  if (!htmlBody) {
    throw 'Không tìm thấy nội dung email';
  }
  // we need to remove comment <!-- --> first since this content prepared by Outlook is really *&^%$!@
  var strippedBody = htmlBody.replace(/<!--[\s\S]*?-->/gm, '');
  strippedBody = strippedBody.replace(/<(?:.|\s)*?>/gm, '').trim();
  // nlapiLogExecution('DEBUG', 'strippedBody', strippedBody);
  var allLines = strippedBody.split('|');
  var ret = {};

  for (var i = 0; i < allLines.length; i++) {
    var line = allLines[i].trim();
    if (!line) continue;
    var parts = line.split(':');
    var propName = parts[0].toLowerCase().trim();
    switch (propName) {
      case 'memo':
        ret.memo = parts[1].trim();;
        break;
      case 'sender':
        ret.sender = parts[1].trim();
        break;
      case 'receiver':
        ret.receiver = parts[1].trim();
        break;
      case 'items':
      case 'item':
        var itemNumbers = parts[1].split(',')
          .map(function (element) { return element.trim(); })
          .filter(function (element) { return element })
          .filter(function (element, index, self) { return self.indexOf(element) === index; });
        ret.itemNumbers = itemNumbers;
        break;
      default:
        // invalid command; ignore
        break;
    }
  }
  // nlapiLogExecution('AUDIT', 'end extractPropertiesFromBody', JSON.stringify(ret));
  return ret;

}