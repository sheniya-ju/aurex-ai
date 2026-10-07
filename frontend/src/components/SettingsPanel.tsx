import { Save, Moon, Sun, Monitor } from "lucide-react";
export type AppSettings={theme:string;model:string;enter_to_send:boolean;show_sources:boolean;auto_scroll:boolean};
type Props={settings:AppSettings; onChange:(next:AppSettings)=>void; onSave:()=>Promise<void>; onClearChats:()=>Promise<void>; onDeleteDocuments:()=>Promise<void>};
export default function SettingsPanel({settings,onChange,onSave,onClearChats,onDeleteDocuments}:Props){
 const set=(key:keyof AppSettings,value:any)=>onChange({...settings,[key]:value});
 return <section className="aurex-panel-page settings-page"><div className="panel-heading"><div><span className="eyebrow">PREFERENCES</span><h2>Settings</h2><p>Control how AUREX behaves on this account.</p></div><button className="primary-button small" onClick={onSave}><Save size={16}/> Save changes</button></div>
 <div className="settings-grid">
  <div className="settings-card"><h3>Appearance</h3><p>Choose the interface theme.</p><div className="theme-options">{[["light","Light",Sun],["dark","Dark",Moon],["system","System",Monitor]].map(([v,label,Icon]:any)=><button key={v} className={settings.theme===v?"theme-choice active":"theme-choice"} onClick={()=>set("theme",v)}><Icon size={17}/>{label}</button>)}</div></div>
  <div className="settings-card"><h3>AI Model</h3><p>The model used for new responses.</p><select value={settings.model} onChange={e=>set("model",e.target.value)}><option value="openai/gpt-oss-20b">GPT-OSS 20B</option></select></div>
  <div className="settings-card"><h3>Chat</h3><Toggle label="Enter to send" value={settings.enter_to_send} onChange={v=>set("enter_to_send",v)}/><Toggle label="Show sources" value={settings.show_sources} onChange={v=>set("show_sources",v)}/><Toggle label="Auto-scroll" value={settings.auto_scroll} onChange={v=>set("auto_scroll",v)}/></div>
  <div className="settings-card danger-card"><h3>Data & Privacy</h3><p>These actions affect your account data.</p><button className="danger-button" onClick={onClearChats}>Clear chat history</button><button className="danger-button" onClick={onDeleteDocuments}>Delete uploaded documents</button></div>
 </div></section>
}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <button className="setting-toggle" onClick={()=>onChange(!value)}><span>{label}</span><span className={`toggle ${value?"on":""}`}><span/></span></button>}
