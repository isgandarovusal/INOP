// Counts only the already-authorized Application/Job cohort assigned to actor.
// No identity lookup, global recruiter directory, candidate names or new query.
const DAYS=86400000;
function facet(actor,at){
 const mongoose=require('mongoose'),active={$in:['$status',['Applied','Screening','Shortlisted','Interview','Offered']]};
 const count=condition=>({$sum:{$cond:[condition,1,0]}});
 const date=(field,lower,upper)=>({$and:[{$eq:[{$type:field},'date']},...(lower?[{$gte:[field,lower]}]:[]),...(upper?[{$lt:[field,upper]}]:[])]});
 return [{$match:{assignedTo:new mongoose.Types.ObjectId(actor)}},{$group:{_id:null,assigned:{$sum:1},active:count(active),
 pendingReviews:count({$and:[active,{$ne:[{$ifNull:['$candidate._id',null]},null]},{$ne:[{$ifNull:['$candidate.cvReview.version',null]},null]},{$ne:['$candidate.cvReview.reviewStatus','confirmed']}]}),
 overdue:count({$and:[active,date('$nextAction.dueAt',null,at)]}),
 upcomingInterviews:count({$and:[{$eq:['$status','Interview']},{$eq:['$interview.result','pending']},date('$interview.startsAt',at,new Date(+at+7*DAYS))]}),
 completed:count({$and:[{$in:['$status',['Hired','Rejected']]},date('$stageEnteredAt',new Date(+at-30*DAYS),new Date(+at+1))]}),
 aging:count({$and:[active,date('$stageEnteredAt',null,new Date(+at-14*DAYS))]})}}];
}
function dto(rows,at){const r=rows?.[0]||{};return{scope:'assigned-to-me',asOf:at,interviewWindowEnds:new Date(+at+7*DAYS),completedWindowStarts:new Date(+at-30*DAYS),agingDays:14,...Object.fromEntries(['assigned','active','pendingReviews','overdue','upcomingInterviews','completed','aging'].map(k=>[k,r[k]||0]))};}
module.exports={facet,dto};
