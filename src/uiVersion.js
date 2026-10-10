export function versionNumber(text=''){
  const match=String(text).match(/V?(\d+)\.(\d+)(?:\.(\d+))?/i);
  return match?Number(match[1])*1000000+Number(match[2])*1000+Number(match[3]||0):-1;
}
// Historical UI modules must neither downgrade the product nor write identical DOM.
export function setUiVersion(version,doc=document){
  const brand=doc.querySelector('.brand small');
  const badges=Array.from(doc.querySelectorAll('.brand [data-v65-version],.brand [data-v64-version],.brand [data-v67-version]'));
  const current=Math.max(versionNumber(doc.title),versionNumber(brand?.textContent),...badges.map(node=>versionNumber(node.textContent)));
  if(versionNumber(version)<current)return false;
  let changed=false;
  if(brand&&brand.textContent!==version){brand.textContent=version;changed=true}
  for(const badge of badges)if(badge.textContent!==version){badge.textContent=version;changed=true}
  const title=`BoxStudio ${version}`;
  if(doc.title!==title){doc.title=title;changed=true}
  return changed;
}
