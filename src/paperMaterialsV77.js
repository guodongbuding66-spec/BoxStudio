import {PAPER_PRESETS_V80} from './paperPresetsV80.js';
import {PAPER_FINISHES_V75} from './studioConfigV75.js';
import {paperTextureSettingsV79} from './paperTextureV79.js';
export const PAPER_PRESETS_V77=[
{id:'sbs-paperboard',name:'白卡纸',face:'#f3f1e8',inner:'#efeee6',thickness:.5,finish:'matte'},
{id:'coated-white',name:'铜版卡纸',face:'#fffef8',inner:'#f1eee5',thickness:.38,finish:'gloss'},
{id:'kraft-paperboard',name:'牛皮卡纸',face:'#bd925e',inner:'#bd925e',thickness:.55,finish:'paper'},
{id:'corrugated-kraft',name:'牛皮瓦楞纸',face:'#c49f69',inner:'#b99a6b',thickness:1.6,finish:'paper'},
{id:'corrugated-white',name:'白面瓦楞纸',face:'#f2efe6',inner:'#bca171',thickness:1.5,finish:'matte'},
{id:'greyboard',name:'灰板纸',face:'#a7a6a0',inner:'#a7a6a0',thickness:1.8,finish:'matte'},
{id:'black-paper',name:'黑色特种纸',face:'#30302f',inner:'#30302f',thickness:.65,finish:'matte'},
{id:'ivory-paper',name:'象牙纹理纸',face:'#e9e2d0',inner:'#e9e2d0',thickness:.5,finish:'matte'}];
export const PAPER_PRESETS_ALL_V80=[...PAPER_PRESETS_V77,...PAPER_PRESETS_V80];
export function paperAppearanceV77(s={}){const base={...PAPER_PRESETS_ALL_V80.find(p=>p.id===s.materialId)||PAPER_PRESETS_V77[3],...(s.paperV77||{})};return{...base,textureV79:paperTextureSettingsV79(base.textureV79||{kind:/corrugated/.test(base.id)?'corrugated':/kraft/.test(base.id)?'kraft':'fiber'})};}
export function validatePaperV77(p){if(!p||!String(p.name||'').trim()||String(p.name).length>60||!['face','inner'].every(k=>/^#[0-9a-f]{6}$/i.test(p[k]))||!Number.isFinite(p.thickness)||p.thickness<.1||p.thickness>15||!Object.hasOwn(PAPER_FINISHES_V75,p.finish))throw new Error('材质名称、颜色、纸厚或纸面效果无效。');return{...p,name:p.name.trim(),textureV79:paperTextureSettingsV79(p.textureV79)};}
