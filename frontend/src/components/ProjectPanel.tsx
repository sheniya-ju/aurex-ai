import { useState } from "react";

import {

  ArrowLeft,

  FolderOpen,

  MessageSquare,

  Pin,

  Plus,

  Save,

  Trash2,

} from "lucide-react";



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



type DocumentItem = {

  id: number;

  filename: string;

  total_pages: number;

};



type ProjectConversation = {

  id: number;

  title: string;

  created_at: string;

  updated_at: string;

  project_id?: number | null;

  is_pinned?: boolean;

};



type Props = {

  projects: Project[];

  documents: DocumentItem[];

  activeProjectId: number | null;

  projectConversations: ProjectConversation[];

  onSelect: (id: number | null) => void;

  onOpenChat: (id: number) => void;

  onBackToChats: () => void;

  onTogglePin: (id: number) => Promise<void>;

  onCreate: (

    name: string,

    description: string,

    instructions: string,

  ) => Promise<void>;

  onUpdate: (

    id: number,

    name: string,

    description: string,

    instructions: string,

  ) => Promise<void>;

  onDelete: (id: number) => Promise<void>;

  onAttach: (projectId: number, documentId: number) => Promise<void>;

  onDetach: (projectId: number, documentId: number) => Promise<void>;

};



export default function ProjectPanel({

  projects,

  documents,

  activeProjectId,

  projectConversations,

  onSelect,

  onOpenChat,

  onBackToChats,

  onTogglePin,

  onCreate,

  onUpdate,

  onDelete,

  onAttach,

  onDetach,

}: Props) {

  const [editing, setEditing] = useState<Project | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [instructions, setInstructions] = useState("");



  const active =

    projects.find((project) => project.id === activeProjectId) || null;



  const startCreate = () => {

    setEditing(null);

    setName("");

    setDescription("");

    setInstructions("");

  };



  const startEdit = (project: Project) => {

    setEditing(project);

    setName(project.name);

    setDescription(project.description);

    setInstructions(project.instructions);

  };



  const save = async () => {

    if (!name.trim()) return;



    if (editing) {

      await onUpdate(

        editing.id,

        name.trim(),

        description.trim(),

        instructions.trim(),

      );

    } else {

      await onCreate(

        name.trim(),

        description.trim(),

        instructions.trim(),

      );

    }



    startCreate();

  };



  return (

    <section className="aurex-panel-page">

      <div className="panel-heading">

        <div>

          <span className="eyebrow">WORKSPACE</span>

          <h2>Projects</h2>

          <p>Keep chats, instructions and documents together.</p>

        </div>



        <button

          className="primary-button small"

          onClick={startCreate}

          type="button"

        >

          <Plus size={16} />

          New project

        </button>

      </div>



      <div className="project-layout">

        <div className="project-list">

          {projects.length === 0 && (

            <div className="empty-panel">

              <FolderOpen size={28} />

              <p>No projects yet.</p>

            </div>

          )}



          {projects.map((project) => (

            <div

              key={project.id}

              className={`project-card ${

                activeProjectId === project.id ? "active" : ""

              }`}

            >

              <button

                type="button"

                className="project-card-main"

                onClick={() => onSelect(project.id)}

              >

                <strong>{project.name}</strong>

                <span>{project.description || "No description"}</span>

                <small>

                  {project.document_count} files ·{" "}

                  {project.conversation_count} chats

                </small>

              </button>



              <div className="project-card-actions">

                <button

                  type="button"

                  title="Edit"

                  onClick={() => startEdit(project)}

                >

                  Edit

                </button>



                <button

                  type="button"

                  className="danger-icon"

                  title="Delete"

                  onClick={() => onDelete(project.id)}

                >

                  <Trash2 size={15} />

                </button>

              </div>

            </div>

          ))}

        </div>



        <div className="project-editor">

          {active && !editing && (

            <div className="project-folder-toolbar">

              <button

                type="button"

                className="secondary-back-button project-back-button"

                onClick={onBackToChats}

              >

                <ArrowLeft size={16} />

                Back to  Normal chats

              </button>



              <div>

                <span className="eyebrow">PROJECT FOLDER</span>

                <h3>{active.name}</h3>

                <p>{active.description || "Project workspace"}</p>

              </div>

            </div>

          )}



          <div className="editor-title">

            <h3>{editing ? "Edit project" : "Create project"}</h3>



            {active && !editing && (

              <span>Active: {active.name}</span>

            )}

          </div>



          <label>

            Name

            <input

              value={name}

              onChange={(event) => setName(event.target.value)}

              placeholder="e.g. LeaveFlow"

            />

          </label>



          <label>

            Description

            <input

              value={description}

              onChange={(event) => setDescription(event.target.value)}

              placeholder="What is this project about?"

            />

          </label>



          <label>

            Instructions

            <textarea

              value={instructions}

              onChange={(event) => setInstructions(event.target.value)}

              placeholder="Tell AUREX how to behave in this project..."

              rows={7}

            />

          </label>



          <button

            className="primary-button"

            onClick={save}

            disabled={!name.trim()}

            type="button"

          >

            <Save size={16} />

            Save project

          </button>



          {active && !editing && (

            <>

              <div className="project-folder-section">

                <div className="project-section-heading">

                  <div>

                    <h3>

                      <MessageSquare size={16} />

                      Project chats

                    </h3>

                    <p>

                      Chats created inside this project automatically use

                      the selected project files for RAG.

                    </p>

                  </div>

                </div>



                <div className="project-chat-list">

                  {projectConversations.length === 0 ? (

                    <div className="project-empty-state">

                      No chats in this project yet. Start a new chat from

                      this project.

                    </div>

                  ) : (

                    projectConversations.map((chat) => (

                      <div

                        className="project-chat-item"

                        key={chat.id}

                      >

                        <button

                          type="button"

                          className="project-chat-main"

                          onClick={() => onOpenChat(chat.id)}

                        >

                          <MessageSquare size={15} />

                          <span>{chat.title}</span>

                        </button>



                        <button

                          type="button"

                          className={`project-chat-pin ${

                            chat.is_pinned ? "pinned" : ""

                          }`}

                          title={

                            chat.is_pinned

                              ? "Unpin chat"

                              : "Pin chat"

                          }

                          aria-label={

                            chat.is_pinned

                              ? "Unpin chat"

                              : "Pin chat"

                          }

                          onClick={() => onTogglePin(chat.id)}

                        >

                          <Pin

                            size={14}

                            fill={

                              chat.is_pinned

                                ? "currentColor"

                                : "none"

                            }

                          />

                        </button>

                      </div>

                    ))

                  )}

                </div>

              </div>



              <div className="project-files">

                <div className="project-section-heading">

                  <div>

                    <h3>Project files</h3>

                    <p>

                      Select PDFs to add to this project. Every chat in

                      this project can use them.

                    </p>

                  </div>

                </div>



                {documents.length === 0 ? (

                  <div className="project-empty-state">

                    Upload a PDF from the chat composer first.

                  </div>

                ) : (

                  documents.map((document) => (

                    <label

                      className="file-toggle"

                      key={document.id}

                    >

                      <input

                        type="checkbox"

                        checked={active.document_ids.includes(

                          document.id,

                        )}

                        onChange={(event) =>

                          event.target.checked

                            ? onAttach(

                                active.id,

                                document.id,

                              )

                            : onDetach(

                                active.id,

                                document.id,

                              )

                        }

                      />



                      <span>{document.filename}</span>

                      <small>

                        {document.total_pages} pages

                      </small>

                    </label>

                  ))

                )}

              </div>

            </>

          )}

        </div>

      </div>

    </section>

  );

}
