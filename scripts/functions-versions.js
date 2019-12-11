var https = require('https');
var exec = require('child_process').exec

//params
var url = "https://api.github.com/repos/atom/atom/releases/latest"
var download_url_tmp = "https://github.com/atom/atom/releases/download/v" // add: <version>/<filename>
var path_latest = ""//"/atom/atom/releases/latest"
var request = require('request');
var filenames = {'win32': 'atom-windows.zip', 'win64': 'atom-x64-windows.zip', 'darwin': 'atom-mac.zip', 'linux': 'atom.x86_64.rpm', 'aix': 'atom.x86_64.rpm'}

module.exports = {
  getCurrentVersions: function(cb){
     exec('atom --version',function(error,stdout,stderr){
       var atom_version = stdout.substring(stdout.indexOf(":")+2,stdout.indexOf("Electron")-1)
       var electron_version = stdout.substring(stdout.indexOf("Electron")+10,stdout.indexOf("Chrome")-1)
       cb(atom_version,electron_version)
     })
  },

  getDownloadUrl: function(version){
    var filename = this.getDownloadFileName()
    return download_url_tmp + version + "/" + filename
  },

  loadLatest: function(cb){
    getContent(url+path_latest,function(data){
      var json_data = JSON.parse(data)
      if(json_data){
        var version = json_data.name
        cb(version)
      }else{
        cb()
      }
    })
  },

  getDownloadFileName: function(){
    var plf = process.platform
    if(plf == 'win32' && process.arch != 'ia32'){
      plf = 'win64'
    }
    return filenames[plf]
  },
  versionBiggerThen: function (a, b) {
      var i, diff;
      var regExStrip0 = /(\.0+)+$/;
      var segmentsA = a.replace(regExStrip0, '').split('.');
      var segmentsB = b.replace(regExStrip0, '').split('.');
      var l = Math.min(segmentsA.length, segmentsB.length);

      for (i = 0; i < l; i += 1) {
          diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
          if (diff) {
              return diff;
          }
      }
      return segmentsA.length - segmentsB.length;
  }
}
function getContent(url,cb){
  var headers = {
    'User-Agent':       'Super Agent/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
  }
  var options = {
    url: url,
    method: 'GET',
    headers: headers
  }

  request(options, function (error,res,body) {
      var data = '';
      cb(body)
  });
}
