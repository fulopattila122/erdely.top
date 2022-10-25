var map;
var geocoder   = new google.maps.Geocoder();
var infowindow = new google.maps.InfoWindow({maxWidth: 350});
var positions  = Array();
var oms;
var mainMarker;

function getMarkerIcon(entity, subtype) {
   if (typeof(entity) !== 'undefined') {
      var markerName = entity;
      markerName += typeof(subtype) !== 'undefined' && '' !== subtype ? '_' + subtype : '';
      
      var icon = window['mi_' + markerName];
      
      if (typeof(icon) !== 'undefined') {
         return icon;
      } else {
         return window['mi_' + entity];
      }
      
   } else {
      return null;
   }
}

function initAsyncByLocationName(lookupName, locationName, zoom, omitMarker, icon){
   geocoder.geocode( { 'address': lookupName + ', Romania' }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
         var position = results[0].geometry.location;
      } else {
         var position = fallbackCenter;
      }
      
      map.setCenter(position);
      
      if (!omitMarker) {
         mainMarker = displayLocation(position, locationName, icon)
         //set default position for editor/revert
         if ( isNaN(parseInt(lat)) || parseInt(lat) == 0) {
            lat = position.lat();
            lon = position.lng();
         }
      }
   });
}

function initOms(map) {
   oms = new OverlappingMarkerSpiderfier(map);
   
   oms.addListener('click', function(marker) {
      infowindow.setContent(marker.desc);
      infowindow.open(map, marker);
   });
   
   oms.addListener('spiderfy', function(markers) {
      infowindow.close();
   });
}

function initGoogleMaps(lat, lon, zoom, locationName, lookupName, omitMarker, entityName, entitySubtype) {
   omitMarker = typeof omitMarker !== 'undefined' ? omitMarker : false;
   var icon   = getMarkerIcon(entityName, entitySubtype);
   
   if ( isNaN(parseInt(lat)) || parseInt(lat) == 0) {
      if (typeof lookupName == 'undefined') lookupName = locationName;
      initAsyncByLocationName(lookupName, locationName, zoom, omitMarker, icon);
      position = fallbackCenter;
      omitMarker = true;
   } else {
      var position = new google.maps.LatLng(lat, lon);
      omitMarker = omitMarker;
   }
   
   var mapOptions = {
      zoom: zoom,
      center: position,
      mapTypeId: google.maps.MapTypeId.ROADMAP
   }
   
   map = new google.maps.Map(document.getElementById("mapCanvas"), mapOptions);
   initOms(map);

   if (!omitMarker) {
      mainMarker = displayLocation(position, locationName, icon);
   }
   
   return true;
}

function displayLocation(location, name, icon) {
   var _icon       = typeof(icon) !== 'undefined' ? icon : null;
   var _shadow     = null == icon ? null : mi_shadow;
   var _shape      = null == icon ? null : mi_shape;
   
   var marker = new google.maps.Marker({
      map: map, 
      position: location,
      title: name,
      raiseOnDrag: true,
      draggable: false,
      icon: _icon,
      shadow: _shadow,
      shape: _shape
   });
   
   positions.push(location);
   oms.addMarker(marker);
   
   return marker;
}

function displayLocationByLatLon(lat, lon, name, icon) {
   return displayLocation(new google.maps.LatLng(lat, lon), name, icon);
}

function addDisplayEntityBubble(marker, entityName, slug, image, text) {
   google.maps.event.addListener(marker, 'click', function () {
      infowindow.setContent(
            '<img src="' + image + '" class="map-bubble">' +
            '<a href="' + slug + '"><h4 class="map-bubble">' + entityName + '</h4></a>' +
            '<p class="map-bubble">' + text + '</p>'
         );
      infowindow.open(map, marker);
   });
}

function displayEntity(lat, lon, locationName, lookupName, entityName, slug, image, text, entitySubtype) {
   
   if ( isNaN(parseInt(lat)) || parseInt(lat) == 0) {
      geocoder.geocode( { 'address': lookupName + ', Romania' }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
         var location = results[0].geometry.location;
      } else {
         var location = fallbackCenter;
      }
      
      marker = displayLocation(location, locationName, getMarkerIcon(entityName, entitySubtype));
      addDisplayEntityBubble(marker, locationName, slug, image, text);
   });
      
   } else {
      marker = displayLocationByLatLon(lat, lon, locationName, getMarkerIcon(entityName, entitySubtype));
      addDisplayEntityBubble(marker, locationName, slug, image, text);
   }

}

var lastPosition = -1;
var centerDelay = 1500; // 500 milliseconds
var maxCenterCount = 3; // max 3 times with same number of positions
var centerCount = 0;

function centerMap()
{ 
   if ( 0 < positions.length ) {
      // map: an instance of GMap2
      // latlng: an array of instances of GLatLng
      var latlngbounds = new google.maps.LatLngBounds( );
      $.each(positions, function(key, val){
         latlngbounds.extend(val);
      });
      map.setCenter(latlngbounds.getCenter());
      map.fitBounds(latlngbounds);
   }
}

function centerMapTimer()
{
   var length = positions.length;
   if (length != lastPosition) {
      centerMap();
      lastPosition = length;
      centerCount = 0;
   } else if (++centerCount >= maxCenterCount) {
      return;
   }

   if (positions.length < eventData.length) {
      setTimeout(centerMapTimer,centerDelay);
   }
}

function loadFbLike($elem, id)
{
   if ('undefined' != typeof(FB)) {
      var $placeholder = $elem.find('.fb-placeholder:first');
      if (0 == $placeholder.find('fb:like').length) {
        $placeholder.empty().append(
          '<fb:like href="' + location.protocol + '//' + location.host + location.pathname.replace(/(\/+)?(E\d+)?$/, '/') + 'E' + id + '" send="true" layout="button_count" width="112" show_faces="false"></fb:like>');
        FB.XFBML.parse($placeholder.get(0));
      }
   }
}

function loadEventFromLocation(bHashChanged)
{
   if (0 < eventData.length) {
      if ('' != location.hash && '#E' == location.hash.substring(0,2)) {
         var id = location.hash.substring(2);
         for (index in eventData) {
            if (eventData[index].id == id) {
               currentEventId = id;
               break;
            }
         }
      }
      if (!currentEventId && !bHashChanged) {
         currentEventId = eventData[Math.floor(Math.random() * eventData.length)].id;
      }
      if (currentEventId) {
         if (bHashChanged) {
            $('.event').removeClass('displayme');
         }
         var $elem = $('#E' + currentEventId);
         loadFbLike($elem, currentEventId);
         $('#E' + currentEventId).addClass('displayme');
       if ('undefined' != typeof(FB)) {
          FB.Canvas.setSize();
        }
      }
   }
}
   
$(window).load(function() {
   /*$(window).bind('hashchange', function() {
      loadEventFromLocation(true);
   });

   $.getJSON('/getlocations.json', function(data) {
      eventData = data;
      loadEventFromLocation(false);
      
      $.each(data, function(key, val) {
        displayLocation(val);
      });
   });

   setTimeout(centerMapTimer,500);*/
});
