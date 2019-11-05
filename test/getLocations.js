require(['N/search', '/SuiteScripts/BtjCustomization/lib/underscore-min.js'], function (search, _) {

  /**
   * Module Description...
   *
   * @exports XXX
   *
   * @copyright 2018 ${organization}
   * @author ${author} <${email}>
   *
   * @NApiVersion 2.0
   * @NModuleScope SameAccount
   */

  var locations = [];
  var locationSearch = search.create({
    type: search.Type.LOCATION,
    columns: [
      { name: 'custrecord_erply_location_id' },
      { name: 'name' },
      { name: 'custrecord_erply_sales_account' }
    ],
    filters: [
      {name: 'custrecord_erply_location_id', operator: search.Operator.ISNOTEMPTY}
    ]
  });

  locationSearch.run().each(function (location) {
    locations.push({
      netsuiteLocationId: location.id,
      id: location.getValue({name: 'custrecord_erply_location_id'}),
      location: location.getValue({ name: 'name' }),
      account: location.getValue({ name: 'custrecord_erply_sales_account' })
    });
    return true;
  });

  var location = _.find(locations, function(location) {
    location.id === 13
  });

  // log.debug('getLocations', locations.length);
  log.debug('getLocations', location);
});
