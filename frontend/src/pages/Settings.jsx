import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Camera, Bell, Database, FlaskConical, Info, AlertTriangle, RotateCcw, Cpu, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/useAppStore'
import { systemApi, settingsApi } from '../services/api'

export default function Settings() {
  const settings       = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const fetchSettings  = useAppStore((s) => s.fetchSettings)
  const [form,       setForm]      = useState(null)
  const [sysInfo,    setSysInfo]   = useState(null)
  const [saving,     setSaving]    = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [mlMetrics,  setMlMetrics] = useState(null)

  useEffect(() => {
    if (settings && !form) setForm({ ...settings })
  }, [settings, form])

  useEffect(() => {
    systemApi.info()
      .then(({ data }) => setSysInfo(data))
      .catch(() => {})
  }, [])

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    const result = await updateSettings(form)
    setSaving(false)
    if (result) toast.success('Settings saved')
  }

  const handleReset = () => {
    fetchSettings().then(() => {
      setForm(null)
      toast('Settings reset to last saved')
    })
  }

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const { data } = await settingsApi.retrainModel()
      setMlMetrics(data)
      toast.success(`Model retrained — accuracy ${(data.accuracy * 100).toFixed(1)}%`)
    } catch {
      toast.error('Retrain failed — check backend logs')
    } finally {
      setRetraining(false)
    }
  }

  if (!form) {
    return (
      <div className="animate-fade-in space-y-4 max-w-3xl">
        <div className="skeleton h-7 w-32 rounded-lg" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Configure detection, camera, and alert behaviour</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Two-column layout for dense packing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Detection Settings */}
        <Section title="Detection" Icon={Brain}>
          <SliderField
            label="Confidence Threshold"
            value={form.confidence_threshold}
            min={40} max={95} step={5} unit="%"
            onChange={(v) => patch('confidence_threshold', v)}
            help="Score at which a fall is declared (lower = more sensitive)"
          />
          <SliderField
            label="FPS Target"
            value={form.fps_target}
            min={5} max={30} step={1} unit=" fps"
            onChange={(v) => patch('fps_target', v)}
            help="Analysis frame rate (higher = more CPU usage)"
          />
          <SelectField
            label="Detection Mode"
            value={form.detection_mode}
            options={[
              { value: 'realtime', label: 'Real-Time' },
              { value: 'offline',  label: 'Offline Only' },
            ]}
            onChange={(v) => patch('detection_mode', v)}
          />
          <SelectField
            label="Sensitivity"
            value={form.sensitivity}
            options={[
              { value: 'low',    label: 'Low (fewer alerts)' },
              { value: 'medium', label: 'Medium (recommended)' },
              { value: 'high',   label: 'High (more sensitive)' },
            ]}
            onChange={(v) => patch('sensitivity', v)}
          />
        </Section>

        {/* Camera Settings */}
        <Section title="Camera" Icon={Camera}>
          <SelectField
            label="Camera Device"
            value={form.camera_device}
            options={[
              { value: '0', label: 'Default Camera (0)' },
              { value: '1', label: 'Camera 1' },
              { value: '2', label: 'Camera 2' },
            ]}
            onChange={(v) => patch('camera_device', v)}
          />
          <SelectField
            label="Resolution"
            value={form.camera_resolution}
            options={[
              { value: '320x240',  label: '320×240 (low)' },
              { value: '640x480',  label: '640×480 (recommended)' },
              { value: '1280x720', label: '1280×720 (HD)' },
            ]}
            onChange={(v) => patch('camera_resolution', v)}
          />
        </Section>

        {/* Alert Settings */}
        <Section title="Alerts" Icon={Bell}>
          <ToggleField
            label="Audio Alerts"
            value={form.audio_alerts}
            onChange={(v) => patch('audio_alerts', v)}
            help="Play a beep when a fall is detected"
          />
          <ToggleField
            label="Visual Flash"
            value={form.visual_flash}
            onChange={(v) => patch('visual_flash', v)}
            help="Flash the screen red on detection"
          />
          <SliderField
            label="Alert Cooldown"
            value={form.alert_cooldown}
            min={5} max={60} step={5} unit=" s"
            onChange={(v) => patch('alert_cooldown', v)}
            help="Silence window after each alert (prevents spam)"
          />
        </Section>

        {/* Storage Settings */}
        <Section title="Storage" Icon={Database}>
          <SliderField
            label="Max Stored Events"
            value={form.max_stored_events}
            min={100} max={5000} step={100} unit=""
            onChange={(v) => patch('max_stored_events', v)}
          />
          <ToggleField
            label="Auto-Delete Old Events"
            value={form.auto_delete_old}
            onChange={(v) => patch('auto_delete_old', v)}
            help="Remove oldest events when the limit is reached"
          />
        </Section>

      </div>

      {/* Demo Mode — full width */}
      <Section title="Demo Mode" Icon={FlaskConical}>
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <ToggleField
              label="Enable Demo Mode"
              value={form.demo_mode}
              onChange={(v) => patch('demo_mode', v)}
              help="Simulate live fall detections using synthetic data (no camera needed)"
            />
          </div>
          {form.demo_mode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-shrink-0"
            >
              <AlertTriangle size={13} className="flex-shrink-0" />
              Demo mode active — falls simulated every ~45 s
            </motion.div>
          )}
        </div>
      </Section>

      {/* ML Model */}
      <Section title="ML Classifier" Icon={Cpu}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-600 font-medium">Retrain Fall Classifier</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Retrains the RandomForest on synthetic + all stored event data.
              Run after collecting real detections to improve accuracy.
            </p>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-secondary flex-shrink-0"
          >
            <RefreshCw size={13} className={retraining ? 'animate-spin' : ''} />
            {retraining ? 'Training…' : 'Retrain Model'}
          </button>
        </div>
        {mlMetrics && (
          <div className="grid grid-cols-4 gap-2 text-xs pt-1">
            {[
              ['Samples',   mlMetrics.samples],
              ['Accuracy',  `${(mlMetrics.accuracy  * 100).toFixed(1)}%`],
              ['Precision', `${(mlMetrics.precision * 100).toFixed(1)}%`],
              ['Recall',    `${(mlMetrics.recall    * 100).toFixed(1)}%`],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-200 text-center">
                <p className="font-mono font-semibold text-slate-700 text-sm">{val}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* System Information */}
      {sysInfo && (
        <Section title="System Information" Icon={Info}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              ['Status',      sysInfo.backend_status],
              ['API Version', sysInfo.api_version],
              ['Python',      sysInfo.python_version],
              ['OpenCV',      sysInfo.opencv_version],
              ['MediaPipe',   sysInfo.mediapipe_version],
              ['Platform',    sysInfo.platform],
              ['CPU Cores',   sysInfo.cpu_count],
              ['Total RAM',   `${sysInfo.total_memory_gb} GB`],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                <p className="text-slate-400">{label}</p>
                <p className="text-slate-700 font-mono mt-0.5 truncate text-[11px]">{val}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, Icon, children }) {
  return (
    <div className="card space-y-4">
      <h3 className="section-title flex items-center gap-2">
        <Icon size={14} className="text-slate-400" />
        {title}
      </h3>
      {children}
    </div>
  )
}

function SliderField({ label, value, min, max, step, unit, onChange, help }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-slate-500">{label}</label>
        <span className="text-xs font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-600 h-1 cursor-pointer"
        aria-label={label}
      />
      {help && <p className="text-[10px] text-slate-400 mt-1">{help}</p>}
    </div>
  )
}

function ToggleField({ label, value, onChange, help }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-slate-600 font-medium">{label}</p>
        {help && <p className="text-[10px] text-slate-400 mt-0.5">{help}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 mt-0.5
          ${value ? 'bg-blue-600' : 'bg-slate-200'}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
            ${value ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-xs text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-44"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
