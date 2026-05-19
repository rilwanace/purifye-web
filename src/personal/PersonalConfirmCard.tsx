import { useState, useEffect } from "react"
import { api } from "../api"
import { useToast } from "../shared/components/Toast"

const ACCENT = "#5B8DEF"

function toTitleCase(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

const CATEGORIES = ["food", "transport", "shopping", "bills", "income", "subscription", "health", "education", "entertainment", "other"]
const DOC_TYPES = ["prescription", "warranty", "ID", "insurance", "certificate", "bill", "other"]
const PRIORITIES = ["high", "medium", "low"]

interface ParsedData {
  source_input_id: string
  workflow: string
  confidence: number
  fields: Record<string, unknown>
  photo_url?: string
  preview_url?: string
  r2_key?: string
  preview_key?: string
}

interface Props {
  parsed: ParsedData
  onClose: () => void
  onSaved: () => void
}

interface Thread {
  id: string
  name: string
}

const WORKFLOWS = ["money", "documents", "tasks", "notes"] as const
type Workflow = typeof WORKFLOWS[number]

function FieldInput({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>{label.toUpperCase()}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none" }}
      />
    </div>
  )
}

function SelectInput({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>{label.toUpperCase()}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function KeyDetailsEditor({
  keyDetails,
  onChange,
}: {
  keyDetails: Record<string, string>
  onChange: (k: string, v: string) => void
}) {
  if (Object.keys(keyDetails).length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      {Object.entries(keyDetails).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#9c9b95", display: "block", marginBottom: 4 }}>
            {toTitleCase(k)}
          </label>
          <input
            type="text"
            value={v}
            onChange={e => onChange(k, e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none" }}
          />
        </div>
      ))}
    </div>
  )
}

export default function PersonalConfirmCard({ parsed, onClose, onSaved }: Props) {
  const [workflow, setWorkflow] = useState<Workflow>(parsed.workflow as Workflow || "notes")
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed.fields || {})) {
      if (k === "key_details" || k === "extracted_text") continue
      f[k] = v != null ? String(v) : ""
    }
    return f
  })
  const [keyDetails, setKeyDetails] = useState<Record<string, string>>(() => {
    const kd = parsed.fields?.key_details
    if (!kd || typeof kd !== "object" || Array.isArray(kd)) return {}
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(kd as Record<string, unknown>)) {
      result[k] = v != null ? String(v) : ""
    }
    return result
  })
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [saving, setSaving] = useState(false)
  const { show } = useToast()

  useEffect(() => {
    if (workflow === "documents" || workflow === "notes") {
      api<Thread[]>(`/api/personal/threads?workflow=${workflow}`)
        .then(setThreads)
        .catch(() => setThreads([]))
    } else {
      setThreads([])
      setThreadId(null)
    }
  }, [workflow])

  function setField(k: string, v: string) {
    setFields(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      const baseFields: Record<string, unknown> = { ...fields }
      if (workflow === "documents") {
        baseFields.key_details = keyDetails
      }
      const body: Record<string, unknown> = {
        source_input_id: parsed.source_input_id,
        workflow,
        fields: baseFields,
        r2_key: parsed.r2_key,
        preview_key: parsed.preview_key,
        thread_id: (workflow === "documents" || workflow === "notes") ? threadId : null,
      }
      if (workflow === "money" && fields.amount) {
        body.fields = { ...baseFields, amount: parseFloat(fields.amount) || 0 }
      }
      if (workflow === "tasks") {
        const f = { ...baseFields }
        if (fields.target_value) f.target_value = parseFloat(fields.target_value) || null
        body.fields = f
      }
      await api("/api/personal/confirm", {
        method: "POST",
        body: JSON.stringify(body),
      })
      onSaved()
      onClose()
    } catch (err) {
      console.error("[personal] confirm save error", err)
      show("Couldn't save — please try again", "error")
    } finally {
      setSaving(false)
    }
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ background: "#1a1a18", borderRadius: "18px 18px 0 0", padding: "20px", maxHeight: "90dvh", overflowY: "auto", animation: "slideUp 0.3s ease" }}>
        <div style={{ width: 32, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />

        {/* Workflow selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {WORKFLOWS.map(wf => (
            <button
              key={wf}
              onClick={() => setWorkflow(wf)}
              style={{
                flex: 1, padding: "6px 4px", borderRadius: 8,
                fontSize: 10, fontFamily: "DM Mono", fontWeight: 600,
                border: workflow === wf ? "1px solid #5B8DEF33" : "1px solid transparent",
                background: workflow === wf ? "#5B8DEF1a" : "rgba(255,255,255,0.04)",
                color: workflow === wf ? ACCENT : "#6a6a64",
                cursor: "pointer",
              }}
            >
              {wf.toUpperCase().slice(0, 4)}
            </button>
          ))}
        </div>

        {parsed.confidence < 0.7 && (
          <div style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 11, fontFamily: "DM Sans", color: "#D4A843" }}>
            Low confidence parse — please review the fields below
          </div>
        )}

        {(parsed.preview_url || parsed.photo_url) && (
          <img src={parsed.preview_url || parsed.photo_url} alt="uploaded" style={{ width: "100%", borderRadius: 10, marginBottom: 14, display: "block", maxHeight: 160, objectFit: "cover" }} />
        )}
        {/* Money fields */}
        {workflow === "money" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setField("direction", "out")}
                style={{ padding: "10px", borderRadius: 8, border: "1px solid " + (fields.direction === "out" ? "#D85A30" : "rgba(255,255,255,0.06)"), background: fields.direction === "out" ? "rgba(216,90,48,0.1)" : "#2a2a28", color: fields.direction === "out" ? "#D85A30" : "#6a6a64", fontFamily: "DM Mono", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                OUT (spent)
              </button>
              <button onClick={() => setField("direction", "in")}
                style={{ padding: "10px", borderRadius: 8, border: "1px solid " + (fields.direction === "in" ? "#5DCAA5" : "rgba(255,255,255,0.06)"), background: fields.direction === "in" ? "rgba(93,202,165,0.1)" : "#2a2a28", color: fields.direction === "in" ? "#5DCAA5" : "#6a6a64", fontFamily: "DM Mono", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                IN (earned)
              </button>
            </div>
            <FieldInput label="Amount" value={fields.amount || ""} onChange={v => setField("amount", v)} type="number" />
            <FieldInput label="Vendor / Person" value={fields.vendor_or_person || ""} onChange={v => setField("vendor_or_person", v)} />
            <SelectInput label="Category" value={fields.category || "other"} onChange={v => setField("category", v)} options={CATEGORIES} />
            <FieldInput label="Date" value={fields.date || new Date().toISOString().slice(0, 10)} onChange={v => setField("date", v)} type="date" />
            <SelectInput label="Recurrence" value={fields.recurrence || "none"} onChange={v => setField("recurrence", v)} options={["none", "weekly", "monthly", "yearly"]} />
            <FieldInput label="Notes" value={fields.notes || ""} onChange={v => setField("notes", v)} />
          </>
        )}

        {/* Document fields */}
        {workflow === "documents" && (
          <>
            <SelectInput label="Document type" value={fields.doc_type || "other"} onChange={v => setField("doc_type", v)} options={DOC_TYPES} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>THREAD</label>
              <select
                value={threadId || ""}
                onChange={e => setThreadId(e.target.value || null)}
                style={{ width: "100%", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none" }}
              >
                <option value="">General (no thread)</option>
                {threads.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <KeyDetailsEditor keyDetails={keyDetails} onChange={(k, v) => setKeyDetails(kd => ({ ...kd, [k]: v }))} />
            <FieldInput label="Expiry date" value={fields.expiry_date || ""} onChange={v => setField("expiry_date", v)} type="date" />
            <FieldInput label="Issued date" value={fields.issued_date || ""} onChange={v => setField("issued_date", v)} type="date" />
            <FieldInput label="Related person" value={fields.related_person || ""} onChange={v => setField("related_person", v)} />
            <FieldInput label="Notes" value={fields.notes || ""} onChange={v => setField("notes", v)} />
          </>
        )}
        {/* Task fields */}
        {workflow === "tasks" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>DESCRIPTION</label>
              <textarea
                value={fields.description || ""}
                onChange={e => setField("description", e.target.value)}
                rows={2}
                style={{ width: "100%", boxSizing: "border-box", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none", resize: "none" }}
              />
            </div>
            <FieldInput label="Due date" value={fields.due_date || ""} onChange={v => setField("due_date", v)} type="date" />
            <SelectInput label="Priority" value={fields.priority || "medium"} onChange={v => setField("priority", v)} options={PRIORITIES} />
            <SelectInput label="Recurrence" value={fields.recurrence || "none"} onChange={v => setField("recurrence", v)} options={["none", "daily", "weekly", "monthly", "yearly"]} />
            <FieldInput label="Notes" value={fields.notes || ""} onChange={v => setField("notes", v)} />
          </>
        )}

        {/* Note fields */}
        {workflow === "notes" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>CONTENT</label>
              <textarea
                value={fields.content || ""}
                onChange={e => setField("content", e.target.value)}
                rows={4}
                style={{ width: "100%", boxSizing: "border-box", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none", resize: "none" }}
              />
            </div>
            <FieldInput label="Tags (comma-separated)" value={Array.isArray(fields.tags) ? (fields.tags as string[]).join(", ") : (fields.tags || "")} onChange={v => setField("tags", v)} />
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontFamily: "DM Mono", color: "#6a6a64", display: "block", marginBottom: 5 }}>THREAD</label>
              <select
                value={threadId || ""}
                onChange={e => setThreadId(e.target.value || null)}
                style={{ width: "100%", background: "#2a2a28", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "DM Sans", color: "#e8e7e0", outline: "none" }}
              >
                <option value="">General (no thread)</option>
                {threads.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9c9b95", fontFamily: "DM Sans", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, " + ACCENT + ", #3A63B8)", color: "#fff", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <style>{"@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }"}</style>
    </div>
  )
}
