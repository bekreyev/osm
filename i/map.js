if (!window.L)
{
	document.write(''
		+'<l'+'ink rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"'
			+'integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ==" crossorigin=""/>'
		+'<s'+'cript src="https://unpkg.com/leaflet@1.6.0/dist/leaflet.js"'
			+'integrity="sha512-gZwIG9x3wUXg2hdXF6+rVkLF/0Vi9U8D2Ntg4Ga5I5BZpVkVxlJWbSQtXPSiUTtC0TjtGOmxa1AJPuV0CPthew==" crossorigin=""></scrip'+'t>'
	)
}

var map = {
init: function(params){
	params = params || {};
	var i, a, t = document.location.hash.replace(/.+?\?/, '').split('&');
	for (i = 0; i < t.length; i++) { a = t[i].split('='); params[a[0]] = a[1]; }

	// или пробуем загрузить последние координаты
	if (!params[i='lat'] && (t=localStorage.getItem(i))) params[i] = t
	if (!params[i='lon'] && (t=localStorage.getItem(i))) params[i] = t
	if (!params[i='z']   && (t=localStorage.getItem(i))) params[i] = t

	var map = L.map(params.id||'map').setView([params.lat||55.74, params.lon||37.62], params.z||11)

	if (!params.lat && document.location.protocol == 'https:') map.locate()

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a>',
		maxZoom: 20,
		maxNativeZoom: 18,
	}).addTo(map)

	map.on('popupopen', function(e){ if (window.make_popup != undefined) e.popup.setContent(window.make_popup(e.popup.options.data, e.popup._source)) })

	map.on('moveend', function(){
		var hash = '?z='+map.getZoom()
		var a = map.getCenter()

		// коррекция долготы для углов > 360 градусов
		var lng = a.lng % 360
		if (lng > 180) lng -= 180
		a.lng = lng

		// обновляем хэш
		if (params.update_hash !== false)
		{
			hash += '&lat='+a.lat+'&lon='+a.lng
			hash = '#'+(Math.round(a.lat*a.lat/10+a.lng*a.lng/10))+'/'+hash
			history.replaceState(null, null, hash);
		}

		// сохраняем также в localStorage
		localStorage.setItem('lat', a.lat)
		localStorage.setItem('lon', a.lng)
		localStorage.setItem('z',   map.getZoom())
	})
	return map
}
}
