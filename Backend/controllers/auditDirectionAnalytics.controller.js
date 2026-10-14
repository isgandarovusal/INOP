const Audit = require('../models/audit.model');
const Restaurant = require('../models/restaurant.model');
const { getAuditScopeFilter } = require('../middleware/auditScope.middleware');
const { canonicalDirection, aliasesFor } = require('../services/auditDirection.service');
const { brandIds } = require('../services/auditCatalog.service');
async function filterFor(req) {
  const query = require('../services/auditQuery.service');
  if(Object.keys(req.query).some(key=>['[',']','$'].some(char=>key.includes(char))))throw Object.assign(new Error('Invalid filter syntax.'),{status:400});
  query.pagination(req);
  for(const key of ['direction','auditType','organizationId','brandId','restaurantId'])query.scalar(req.query[key],key);
  if(req.query.organizationId && req.query.organizationId!=='gfc')throw Object.assign(new Error('Unknown organization.'),{status:400});
  const scope = await getAuditScopeFilter(req);
  if (!scope) throw Object.assign(new Error('Audit scope denied.'), { status: 403 });
  const filter = [scope,query.dateRange(req)];
  const requested = req.params.direction || req.query.direction || req.query.auditType;
  const candidates=[req.params.direction,req.query.direction,req.query.auditType].filter(Boolean).map(canonicalDirection);
  if(candidates.some(value=>!value)||new Set(candidates).size>1)throw Object.assign(new Error('Conflicting or unknown direction.'),{status:400});
  if (requested) {
    const direction = canonicalDirection(requested);
    if (!direction) throw Object.assign(new Error('Unknown direction.'), { status: 400 });
    filter.push({ auditType: { $in: aliasesFor(direction) } });
  }
  if (req.query.brandId) {
    if (!brandIds.includes(req.query.brandId)) throw Object.assign(new Error('Unknown brand.'), { status: 400 });
    const restaurants = await Restaurant.find({ organizationId: 'gfc', brandId: req.query.brandId }).select('id').lean();
    filter.push({ restaurantId: { $in: restaurants.map(row => row.id) } });
  }
  if(req.query.organizationId && !req.query.brandId){const rows=await Restaurant.find({organizationId:'gfc',brandId:{$in:brandIds}}).select('id').lean();filter.push({restaurantId:{$in:rows.map(row=>row.id)}});}
  if (req.query.restaurantId) {
    if (typeof req.query.restaurantId !== 'string') throw Object.assign(new Error('Invalid restaurant.'), { status: 400 });
    const restaurant=await Restaurant.findOne({id:req.query.restaurantId}).select('organizationId brandId').lean();
    if(!restaurant || (req.query.brandId && restaurant.brandId!==req.query.brandId) || (req.query.organizationId && restaurant.organizationId!==req.query.organizationId))throw Object.assign(new Error('Restaurant does not match the selected catalog.'),{status:400});
    filter.push({ restaurantId: req.query.restaurantId });
  }
  return { $and: filter };
}
exports.filterFor = filterFor;
exports.overview = async(req,res)=>{
  try {
    const filter = await filterFor(req);
    const [row] = await Audit.aggregate([
      {$match:filter},{$set:{normalizedScore:require('../services/auditScore.service').auditScoreExpression}},
      {$group:{_id:null,total:{$sum:1},completed:{$sum:{$cond:[{$eq:['$status','completed']},1,0]}},scored:{$sum:{$cond:[{$isNumber:'$normalizedScore'},1,0]}},averageScore:{$avg:'$normalizedScore'}}},
    ]);
    res.json({success:true,data:{total:row?.total||0,completed:row?.completed||0,scored:row?.scored||0,unscored:(row?.total||0)-(row?.scored||0),averageScore:row?.averageScore??null,scoreUnit:'out-of-10'}});
  }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Analytics failed.'});}
};
