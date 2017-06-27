// installing and re-compiling serialport

var exec = require('child_process').exec

if (process.platform != 'win32') {
  console.log("Installing serialport")
  exec('npm install serialport',
    function(error,stdout,stderr){
      if(error){
        console.log(error)
      }else{
        console.log("Installing electron rebuild")
        exec('npm install electron-rebuild',
          function(error,stdout,stderr){
            if(error){
              console.log(error)
            }else{
              console.log("Rebuilding...")
              exec('$(npm bin)/electron-rebuild -f -w serialport -v 1.3.13',
                function(error,stout,stderr){
                  if(error){
                    console.log(error)
                  }
                  console.log("Done!")
                }
              )
            }
          }
        )
      }
    }
  )
}
