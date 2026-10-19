// Explicit opt-in only. Never discover or fall back to another local/production DB.
exports.port=()=>{
 if(process.env.INOP_AUDIT_TEST_PORT!=='27018')throw Error('Owned QA requires explicit INOP_AUDIT_TEST_PORT=27018; no database connection was attempted.');
 return '27018';
};
