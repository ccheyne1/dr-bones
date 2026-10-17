export const efforts=['none','minimal','low','medium','high','xhigh','max','ultra'];
export function reasoningLevels(model){
  const supplied=model?.reasoningLevels??model?.supported_reasoning_levels;
  if(Array.isArray(supplied))return [...new Set(supplied.map(x=>typeof x==='string'?x:x?.effort).filter(x=>efforts.includes(x)))];
  // Official model documentation checked October 14, 2026. Other models
  // rely on their catalog metadata; never assume all models share levels.
  return model?.slug==='gpt-5.6-luna'?['none','low','medium','high','xhigh','max']:[];
}
export function resolveReasoning(model,selection='auto'){
  const levels=reasoningLevels(model);
  if(selection==='auto')return model?.slug==='gpt-5.6-luna'&&levels.includes('none')?'none':'default';
  if(selection==='default'||levels.includes(selection))return selection;
  throw Error('This reasoning level is not supported by the selected model. Choose an available level or Model default.');
}
export function modelChoice(model){
  return {slug:model.slug,name:model.display_name||model.slug,reasoningLevels:reasoningLevels(model)};
}
