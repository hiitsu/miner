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
	,tag = argv.tag || 'img'
	,attr = argv.attr || 'src'
	,recurse = argv.recurse || 0
	,baseURL = argv.url || 'http://www.flickr.com/explore'
	,dir = argv.path || __dirname+'/data'
	,reset = argv.reset || true;

if( reset )
	wrench.rmdirSyncRecursive(dir);
if( !fs.existsSync(dir) )
	wrench.mkdirSyncRecursive(dir,'0777');
console.log("going for "+baseURL+" to find all *."+ext+" files and saving them to "+dir);

function go(link,callback,level) {
	if( !visited[link] ) {
		request(link, function (error, response, body) {
			visited[link] = true;
			var links = jquery(body).find(tag+'['+attr+'$=".'+ext+'"]').get();
			console.log(link + ' received: '+body.length + ' bytes with '+links.length+' matches');
			async.forEachLimit(links,3,function(e,done){
				var target = jquery(e).attr(attr);
				if( /^\//.test(target) )
					target = baseURL + target;
				if( !visited[target] ) {
					visited[target] = true;
					var basename = path.basename(target);
					var fullfile = dir+'/'+ basename;
					console.log("requesting "+basename);
					//pipe(fs.createWriteStream(fullfile));
					request({uri:target,encoding:null,output: "buffer"},function(error, response, body){
						if( !error && response.statusCode === 200 && body instanceof Buffer ) {
							console.log("received "+basename+", length:"+body.length+", is buffer:"+(body instanceof Buffer));
							fs.writeFile(fullfile,body,function(err) {
								console.log("written "+basename+" to "+fullfile);
								done(err);
							});
						}
						else {
							console.error(response.statusCode+" error with "+basename+":"+error);
							done(error);
						}
					});
				} else done();
			},function() {
				if( recurse > level ) {
					var otherLinks = jquery(body).find('a[href^="'+baseURL+'"]');
					otherLinks.each(function(index,otherLink){
						var a = jquery(otherLink).attr('href');
						if( !visited[a] )
							go(a,function(){
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