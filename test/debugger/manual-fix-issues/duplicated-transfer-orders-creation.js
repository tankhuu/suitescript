require(['N/record'], function (record) {
  // Collect the list of duplicated TO from Saved Search: customsearch_ss_to_dup_creation
  var duplicatedTOList = [3705622];
  duplicatedTOList.forEach(function (toId) {
    var deletedRecord = record.delete({ type: record.Type.TRANSFER_ORDER, id: toId });
    log.debug('DeletedTOId: ', deletedRecord);
  })
})