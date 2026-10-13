const test=require('node:test'),assert=require('node:assert/strict');
test('Enterprise labels and all application status values resolve in AZ, EN and RU',()=>{
 for(const locale of ['az','en','ru']){
  const data=require('../src/i18n/locales/'+locale+'.json');
  const paths=['auth.heroTitle','auth.heroSubtitle','auth.emailInvalid','auth.passwordRequired','auth.features.recruitment','auth.features.analytics','auth.features.access','hrCandidateUI.matchingTotal','hrCandidateUI.pageShown','hrAnalytics.invalidRange','recruitment.jobForm.descriptionRequired','recruitment.jobForm.sections.basic','recruitment.jobForm.sections.organization','recruitment.jobForm.sections.requirements','hrCatalog.catalogInvalid','hrCatalog.catalogDuplicate','hrCatalog.catalogHint',...['applied','screening','shortlisted','interview','offered','hired','rejected'].map(s=>'recruitment.applicationStatus.'+s)];
  for(const path of paths){const value=path.split('.').reduce((object,key)=>object?.[key],data);assert.equal(typeof value,'string',locale+': '+path);assert.ok(value.trim(),locale+': '+path);}
 }
});
