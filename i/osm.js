var osm = {
search_region: 60, // коэффициент округления координат (чем меньше - тем больший регион скачивается)

/** поиск объектов в OSM базе */
search: function(filter, handler){
	var bounds = ''
	if (filter.bounds)
	{
		filter.bounds, k = osm.search_region
		bounds = ''
			+ '(' + Math.floor(filter.bounds[1]*k)/k
			+ ',' + Math.floor(filter.bounds[0]*k)/k
			+ ',' + Math.ceil( filter.bounds[3]*k)/k
			+ ',' + Math.ceil( filter.bounds[2]*k)/k
			+ ')';
		delete filter.bounds
	}

	var type = {}
	if (filter[x='node'])     { type[x]=1; delete filter[x] }
	if (filter[x='way'])      { type[x]=1; delete filter[x] }
	if (filter[x='relation']) { type[x]=1; delete filter[x] }
	if (!type.node && !type.way && !type.relation) type = {nwr:1}

	var i, f=''
	for (i in filter)
	{
		if (i == 'id') { f = '(id:'+filter[i]+')'; break; }
		f += '["'+i+'"'
		if (filter[i] !== true)
			f += filter[i] ? '="'+filter[i]+'"' : ''
		f += ']'
	}

	var query = ''
		+'[out:json];('
			+(type.node    ?('node'+f+bounds+';'):'')
			+(type.way     ?('way' +f+bounds+';'):'')
			+(type.relation?('rel' +f+bounds+';'):'')
			+(type.nwr     ?('nwr' +f+bounds+';'):'')
		+');(._;>;);out body;';

	ajax('/overpass/?data='+encodeURIComponent(query)
		+'&domain='+encodeURIComponent(window.location.hostname), function(x){
		var i, j, a, data = []
		var nodes = {}, ways = {}

		if (!x.elements) return handler(data)

		for (i = 0; i < x.elements.length; i++)
		{
			a = x.elements[i]
			if (a.tags)
			for (j in filter)
			if (j == 'id')
			{
				if (a.id == filter[j]) { data.push(a); break }
			}
			else
			if (a.tags[j])
			if (filter[j] === true || (filter[j] && a.tags[j] == filter[j]))
			{
				data.push(a)
				break
			}

			if (a.type == 'node') nodes[a.id] = a; else
			if (a.type == 'way')  ways [a.id] = a
		}

		var _coords = function(a){
			var i, id, res = []
			for (i=0; i<a.length; i++)
			{
				id = (typeof(a[i]) == 'object') ? a[i].id : a[i]
				if (nodes[id])
					res.push([ nodes[id].lon, nodes[id].lat ])
			}
			return res
		}

		var is_sibling = function(x, y)
		{
			if (x == y) return 0
			if (ways[x].nodes[ways[x].nodes.length - 1] == ways[y].nodes[0]) return 1
			if (ways[x].nodes[ways[x].nodes.length - 1] == ways[y].nodes[ways[y].nodes.length - 1]) return 2
			return 0
		}

		// создаём список точек для геометрии
		for (a=data[i=0]; i<data.length; a=data[++i])
		{
			data[i].geoJSON = []
			if (a.type == 'relation')
			{
				var ref, k, last_node = 0, is_reverse
				var x = []

				// сортировка веев и разворачивание для правильной геометрии
				var _members = [], _last = null
				for (j = 0; j < a.members.length; j++)
				if (0
					|| !_last                           // первый вэй оставляем как есть
					|| a.members[j].role != 'outer')    // и добавляем всё что не outer
					_members.push(_last = a.members[j])
				for (j = 0; j < a.members.length; j++)
				if (a.members[j].role == 'outer')
				if (is_reverse = is_sibling(_last.ref, a.members[j].ref))
				{
					if (is_reverse == 2) ways[a.members[j].ref].nodes.reverse()
					_members.push(_last = a.members[j])
					j = 0
				}
				a.members = _members

				// теперь перебираем все члены отношения
				for (j = 0; j < a.members.length; j++)
				if (a.members[j].role == 'outer')
				{
					ref = a.members[j].ref
					if (!ways[ref]) continue

					// COMMENT: если узел уже есть в списке, то его пропускаем, чтобы не было дубликатов точек в линии
					for (k = 0; k < ways[ref].nodes.length; k++)
					{
						last_node = ways[ref].nodes[k]
						if (x.indexOf(last_node) == -1)
							x.push(last_node)
					}
				} else
				if (a.members[j].role == 'part')
				{
					ref = a.members[j].ref
					if (!ways[ref]) continue

					data[i].geoJSON.push(_coords(ways[ref].nodes))
					x = x.concat(ways[ref].nodes)
				}

				data[i].nodes = x
				if (!data[i].geoJSON.length) data[i].geoJSON.push(_coords(x))
			}

			if (a.type == 'way' || a.type == 'relation')
			{
				x=[]; data[i].center=[0, 0]
				for (j=0; j<data[i].nodes.length; j++)
				if (nodes[data[i].nodes[j]])
				{
					x.push(nodes[data[i].nodes[j]])
					data[i].center[0] += nodes[data[i].nodes[j]].lat
					data[i].center[1] += nodes[data[i].nodes[j]].lon
				}
				if (x.length > 0)
				{
					data[i].center[0] /= x.length
					data[i].center[1] /= x.length
				}

				data[i].geo = _coords(data[i].nodes)
				data[i].nodes = x

				if (a.type == 'way')
					data[i].geoJSON.push(data[i].geo)
			}
			if (a.type == 'node')
				data[i].center = [a.lat, a.lon]

			if (a.type == 'node')
				data[i].geoJSON = {type: 'Point', coordinates: [a.lon, a.lat]}
			else
				data[i].geoJSON = {type: 'MultiPolygon', coordinates: [data[i].geoJSON]}
		}

		handler(data)
	})
},

/** ссылка на объект */
link: function(id, type)
{
	if (!type) type = josm.getType(id)
	if (!type) return ''
	return 'http://www.openstreetmap.org/browse/'+type+'/'+id
},
/** тип объекта */
getType: function(id)
{
	var type; id += ''

	if (id.charAt(0) == 'n') type = 'node'
	if (id.charAt(0) == 'w') type = 'way'
	if (id.charAt(0) == 'r') type = 'relation'

	id = id.replace(/\D/g, '')
	if (!type) type = 'node'
	return type
},

/** ссылки на редактирование */
editLinks: function(a, params)
{
	var st = ''
	st +='<hr><small>'
	let link = osm.link(a.id, a.type)
	if (!link) return ''
	st += '<a target="_blank" href="'+link+'">Открыть в OSM</a>'
	if (josm.running)
	{
		st += '   <a target="josm" href="'+josm.link(a)+'">Загрузить в JOSM</a>'
		if (params)
		{
			if (params.onedit) this.onedit = params.onedit
			delete params.onedit
			st += ' (<a target="josm" href="'+josm.link_edit(a, params)+'" onclick="osm.onEdit()">Правка</a>)'
		}
	}
	st += '   <a target="_blank" href="http://level0.osmz.ru/?url='+a.type+'/'+a.id+'">Открыть в level0</a>'
	return st
},
onEdit: function()
{
	this.onedit()
},

}
