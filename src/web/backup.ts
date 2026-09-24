import {newProject,validateProjects,type Project} from '../lib/projects';
export function parseBackup(text:string):Project[]{
 if(text.length>80*1024*1024)throw new Error('备份文件不能超过 80 MB。');
 const data=JSON.parse(text);
 if(data?.schemaVersion===1&&Array.isArray(data.projects))return validateProjects(data.projects);
 if(data?.version===1&&data.options){const {version,options,completed,...pattern}=data;const p=newProject('导入的图纸',pattern,options);p.completed=completed??[];return validateProjects([p]);}
 throw new Error('请选择 BeadBoo 导出的 JSON 图纸或备份文件。');
}
