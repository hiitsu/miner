var argv = require('optimist').argv,
	jquery = require('jquery'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	wrench = require('wrench'),
	path = require('path'),
	slugs = require("slugs");
	
var entries = []
	,visited = {}
	,ext = argv.extension || 'jpg'
	,tag = argv.tag || 'a'
	,attr = argv.attr || 'href'
	,recurse = argv.recurse || 0
	,baseURL = argv.url || 'http://google.com'
	,dir = argv.path || __dirname+'/data';

if( !fs.existsSync(dir) )
	wrench.mkdirSyncRecursive(dir,'0777');
console.log("going for "+baseURL+" to find all *."+ext+" files and saving them to "+dir);

function go(link,callback,level) {
	if( !visited[link] ) {
		request(link, function (error, response, body) {
			visited[link] = true;
			var links = jquery(body).find(tag+'['+attr+'$=".'+ext+'"]').get();
			console.log(link + ' received: '+body.length + ' bytes with '+links.length+' matches');
			async.forEachSeries(links,function(e,done){
				var target = jquery(e).attr(attr);
				if( !visited[target] ) {
					visited[target] = true;
					console.log("requesting "+target); 
					var r = request(target).pipe(fs.createWriteStream(dir+'/'+path.basename(target)));
					r.on('end', function () {
						console.log('finished '+target);
						done();
					});
				}
			},function() {
				if( recurse > level ) {
					var otherLinks = jquery(body).find('a[href^="'+baseURL+'"]');
					otherLinks.each(function(index,otherLink){
						var a = jquery(otherLink).attr('href');
						if( !visited[a] )
							go(a,visited,function(){
								callback();
							},level++);
					});
				}
			});
		});
	} else return callback();
}

go(baseURL,function(){
	console.log('done!');
},0);