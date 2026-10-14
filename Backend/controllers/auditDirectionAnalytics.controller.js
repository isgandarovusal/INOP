const Audit = require('../models/audit.model');
const Restaurant = require('../models/restaurant.model');
const { getAuditScopeFilter } = require('../middleware/auditScope.middleware');
const { canonicalDirection, aliasesFor } = require('../services/auditDirection.service');
const { brandIds } = require('../services/auditCatalog.service');
async function filterFor(req) {
  const scope = await getAuditScopeFilter(req);
  if (!scope) throw Object.assign(new Error('Audit scope denied.'), { status: 403 });
  const filter = [scope];
  const requested = req.params.direction || req.query.direction;
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
  if (req.query.restaurantId) {
    if (typeof req.query.restaurantId !== 'string') throw Object.assign(new Error('Invalid restaurant.'), { status: 400 });
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
