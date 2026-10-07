import { useState } from "react";
import { Plus, Trash2, Save, FolderOpen } from "lucide-react";

export type Project = {
  id: number;
  name: string;
  description: string;
  instructions: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  conversation_count: number;
  document_ids: number[];
};

type DocumentItem = { id:number; filename:string; total_pages:number };

type Props = {
  projects: Project[];
  documents: DocumentItem[];
  activeProjectId: number | null;
  onSelect: (id:number|null) => void;
  onCreate: (name:string, description:string, instructions:string) => Promise<void>;
  onUpdate: (id:number, name:string, description:string, instructions:string) => Promise<void>;
  onDelete: (id:number) => Promise<void>;
  onAttach: (projectId:number, documentId:number) => Promise<void>;
  onDetach: (projectId:number, documentId:number) => Promise<void>;
};

export default function ProjectPanel({projects,documents,activeProjectId,onSelect,onCreate,onUpdate,onDelete,onAttach,onDetach}:Props){
  const [editing,setEditing]=useState<Project|null>(null);
  const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [instructions,setInstructions]=useState("");
  const active=projects.find(p=>p.id===activeProjectId) || null;
  const startCreate=()=>{setEditing(null);setName("");setDescription("");setInstructions("");};
  const startEdit=(p:Project)=>{setEditing(p);setName(p.name);setDescription(p.description);setInstructions(p.instructions);};
  const save=async()=>{if(!name.trim()) return; if(editing) await onUpdate(editing.id,name,description,instructions); else await onCreate(name,description,instructions); startCreate();};
  return <section className="aurex-panel-page">
    <div className="panel-heading"><div><span className="eyebrow">WORKSPACE</span><h2>Projects</h2><p>Keep chats, instructions and documents together.</p></div><button className="primary-button small" onClick={startCreate}><Plus size={16}/> New project</button></div>
    <div className="project-layout">
      <div className="project-list">
        {projects.length===0 && <div className="empty-panel"><FolderOpen size={28}/><p>No projects yet.</p></div>}
        {projects.map(p=><div key={p.id} className={`project-card ${activeProjectId===p.id?"active":""}`}>
          <button className="project-card-main" onClick={()=>onSelect(p.id)}><strong>{p.name}</strong><span>{p.description||"No description"}</span><small>{p.document_count} files · {p.conversation_count} chats</small></button>
          <div className="project-card-actions"><button title="Edit" onClick={()=>startEdit(p)}>Edit</button><button className="danger-icon" title="Delete" onClick={()=>onDelete(p.id)}><Trash2 size={15}/></button></div>
        </div>)}
      </div>
      <div className="project-editor">
        <div className="editor-title"><h3>{editing?"Edit project":"Create project"}</h3>{active && !editing && <span>Active: {active.name}</span>}</div>
        <label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. LeaveFlow"/></label>
        <label>Description<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is this project about?"/></label>
        <label>Instructions<textarea value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Tell AUREX how to behave in this project..." rows={7}/></label>
        <button className="primary-button" onClick={save} disabled={!name.trim()}><Save size={16}/> Save project</button>
        {active && !editing && <div className="project-files"><h3>Project files</h3><p>Select PDFs to add to this project.</p>{documents.map(d=><label className="file-toggle" key={d.id}><input type="checkbox" checked={active.document_ids.includes(d.id)} onChange={e=>e.target.checked?onAttach(active.id,d.id):onDetach(active.id,d.id)}/><span>{d.filename}</span><small>{d.total_pages} pages</small></label>)}</div>}
      </div>
    </div>
  </section>;
}
