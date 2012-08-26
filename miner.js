var argv = require('optimist')
		.string('url','tag','attr','extension','path')
		.argv,
	jquery = require('jquery'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	wrench = require('wrench'),
	path = require('path'),
	url = require('url');
	
var downloaded = {}
	,visited = {}
	,ext = argv.extension || 'jpg'
	,tag = argv.tag || 'img'
	,attr = argv.attr || 'src'
	,recurse = argv.recurse || 0
	,startURL = argv.url || 'http://www.flickr.com/explore'
	,parsedURL = url.parse(startURL)
	,dir = argv.path || __dirname+'/data'
	,reset = argv.reset || true
	,serverBase = parsedURL.protocol+'//'+parsedURL.host;

function relativeBase(s) {
	var o = url.parse(s),
		d = /\/$/.test(o.path) ? o.path : path.dirname(o.path);
	return o.protocol+'//'+o.host+d;
}

if( reset )
	wrench.rmdirSyncRecursive(dir,true);
if( !fs.existsSync(dir) )
	wrench.mkdirSyncRecursive(dir,'0777');
console.log("going for "+startURL+" to find all *."+ext+" files and saving them to "+dir);

function isWorkable(s) {
	if( s.substring(0,1) === '#')
		return false;
	if( /^javacript:/.test(s) || /^mailto:/.test(s) )
		return false;
	return true;
}
function normalize(link,s) {
	var normalized = s;
	if( s.substring(0,1) === '/' )
		normalized = serverBase + s;
	else if( s.substring(0,4).toLocaleLowerCase() !== 'http' )
		normalized = relativeBase(link) + s;
	return normalized;
}

function findLinks(link,body) {
	var a = [];
	var b = jquery(body).find('a');
	b.each(function(index,e){
		var c = jquery(e).attr('href').trim();
		if( isWorkable(c) ) {
			var normalized = normalize(link,c);
			if( !visited[normalized] )
				a.push(normalized);
		}
	});
	console.log(link + ' has links ' +a);
	return a;
}

function findTargets(link,body) {
	var a = [], s = tag+'['+attr+'$=".'+ext+'"]';
	try {
		var b = jquery(body).find(s);
	} catch(E) {
		console.error(E);
		console.error(s);
		return a;
	}
	b.each(function(index,e){
		var c = jquery(e).attr(attr).trim();
		if( isWorkable(c) ) {
			var normalized = normalize(link,c);
			if( !downloaded[normalized] )
				a.push(normalized);
		}
	});
	console.log(link + ' has targets:');
	console.log(a);
	return a;
}

function write(uri,basename,fullfile,cb) {
	request({uri:uri,encoding:null,output: "buffer"},function(error, response, body){
		if( !error && response && response.statusCode === 200 && body instanceof Buffer ) {
			console.log("received "+basename+", length:"+body.length+", is buffer:"+(body instanceof Buffer));
			fs.writeFile(fullfile,body,function(err) {
				console.log("written "+basename+" to "+fullfile);
				cb(err);
			});
		}
		else {
			console.error("error with "+basename);
			console.error(error);
			cb(error);
		}
	});
}

function go(link,callback,level) {
	if( !visited[link] ) {
		request(link, function (error, response, body) {
			if( error ) {
				console.error(error);
				return callback();
			}
			visited[link] = true;
			var targets = findTargets(link,body);
			console.log(link + ' has '+targets.length+' targets.');
			async.forEachLimit(targets,2,function(target,done){
				if( !downloaded[target] ) {
					downloaded[target] = true;
					var basename = path.basename(target);
					var fullfile = dir+'/'+ basename;
					console.log("requesting "+basename);
					write(target,basename,fullfile,function(error) { done(error); });
				} else done();
			},function() {
				if( recurse > level ) {
					var b = findLinks(link,body);
					async.forEachLimit(b,2,function(recurseLink,done2){
						go(recurseLink,function() {
							done2();
						},level++);
					},function() {
						callback();
					});
				} else return callback();
			});
		});
	} else return callback();
}

go(startURL,function(){
	console.log('Visited:');
	console.log(Object.keys(visited));
	console.log('done!');
},0);