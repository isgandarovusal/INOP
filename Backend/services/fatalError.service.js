// Bootstrap only. An unsafe process must terminate; never print the raw exception.
exports.install=(runtime=process)=>{
 const fatal=error=>{try{require('node:fs').writeSync(2,JSON.stringify({event:'fatal_backend_error',status:require('./safeErrorLog.service').safeStatus(error)})+'\n');}catch{/* Termination must not depend on log transport. */}runtime.exit(1);};
 runtime.once('uncaughtException',fatal);runtime.once('unhandledRejection',fatal);
};
