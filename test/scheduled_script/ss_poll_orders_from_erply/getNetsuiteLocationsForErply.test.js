require(['N/search'],
  function (search) {

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

    /**
     * Collect Netsuite Locations Information for Erply Locations
     *
     * @return {Array}
     */
    function getNestuieLocationsInformationFromErplyLocations() {
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

      // log.debug('getLocations', locations.length);
      return locations;
    }

    var NETSUITE_ERPLY_LOCATIONS = getNestuieLocationsInformationFromErplyLocations();
    log.debug('NETSUITE_ERPLY_LOCATIONS', NETSUITE_ERPLY_LOCATIONS);
  });
