const directions = Object.freeze(['hr', 'service', 'standard', 'occupational-safety']);
const canonicalDirection = value => value === 'safety' ? 'occupational-safety' : directions.includes(value) ? value : null;
const aliasesFor = direction => direction === 'occupational-safety' ? ['occupational-safety', 'safety'] : [direction];
module.exports = { directions, canonicalDirection, aliasesFor };
// Explicit additive grants; legacy profiles retain their single primary direction.
const profileDirections=profile=>{
 if(!profile?.active||profile.organizationId!=='gfc'||!directions.includes(profile.direction))return[];
 if(profile.directions===undefined)return[profile.direction];
 if(!Array.isArray(profile.directions)||!profile.directions.length||!profile.directions.includes(profile.direction)||profile.directions.some(d=>!directions.includes(d))||new Set(profile.directions).size!==profile.directions.length)return[];
 return profile.directions;
};
const hasDirection=(profile,direction)=>profileDirections(profile).includes(canonicalDirection(direction));
const profileQuery=direction=>({$or:[{direction},{directions:direction}]});
module.exports={...module.exports,profileDirections,hasDirection,profileQuery};
