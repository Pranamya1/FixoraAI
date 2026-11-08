import { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Check, 
  Sparkles, 
  Database,
  Image as ImageIcon,
  FileCode,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export function GuidelinesView() {
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [docName, setDocName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [guidelineText, setGuidelineText] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      setLoading(true);
      const res = await api.getGuidelines();
      setGuidelines(res);
    } catch (err) {
      console.error('Failed to load guidelines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGuideline = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name || 'this guideline'}"? This will remove its indexed rules.`)) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteGuideline(id);
      setGuidelines(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      alert(`Failed to delete guideline: ${err.message || 'Error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) {
        setDocName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!docName.trim()) { setFormError('Enter a document title before uploading.'); return; }
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadSuccess(false);
      await api.uploadGuidelineFile(selectedFile, docName, version);
      setUploadSuccess(true);
      setSelectedFile(null);
      setDocName('');
      await loadGuidelines();
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'The document could not be uploaded.');
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!docName.trim()) { setFormError('Enter a document title before saving these guidelines.'); return; }
    if (!guidelineText.trim()) { setFormError('Paste guideline text or choose a file to upload.'); return; }
    try {
      setUploading(true);
      await api.uploadRawGuideline(docName, guidelineText, version);
      setGuidelineText(''); setDocName('');
      await loadGuidelines();
      setUploadSuccess(true); setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) { setFormError(err instanceof Error ? err.message : 'The guideline text could not be saved.'); console.error('Text guideline save failed:', err); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex flex-wrap items-center gap-2">
            Brand Guidelines & Knowledge Base
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold whitespace-nowrap shrink-0">
              pgvector (768-dim)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add rules by pasting text or uploading a PDF or image. FixoraAI indexes them so post reviews can reference them.
          </p>
        </div>
      </div>

      {/* Company Official Guidelines PDF Card */}
      <div 
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)'
        }}
        className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div 
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--theme-primary)'
            }}
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Official Brand Guidelines</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active B2B Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive posting rules: Attractive & Bold + Clear & Professional tones, engineering claims, prohibited competitor mentions, and LinkedIn formatting.
            </p>
          </div>
        </div>

        <a
          href="/Brand_Guidelines.pdf"
          download="Brand_Guidelines.pdf"
          style={{
            backgroundColor: 'var(--theme-primary)',
            color: '#ffffff'
          }}
          className="px-4 py-2 rounded-lg text-xs font-bold shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity shadow-xs"
        >
          <span>Download PDF Manual</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-5">
          <form onSubmit={selectedFile ? handleUpload : handleTextSubmit} className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-indigo-600" />
              Add Guidelines
            </h3>

            {/* Drop Zone */}
            <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 text-center bg-slate-50/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1.5">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <UploadCloud className="h-4 w-4" />
                </div>
                {selectedFile ? (
                  <div className="text-xs">
                    <p className="font-bold text-emerald-700 truncate">{selectedFile.name}</p>
                    <p className="text-slate-500 text-[11px]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700">Choose PDF or Image (.png, .jpg)</p>
                    <p className="text-slate-500 text-[11px]">PyMuPDF text extraction + Gemini Vision OCR</p>
                  </div>
                )}
              </div>
            </div>

            <textarea value={guidelineText} onChange={(e) => setGuidelineText(e.target.value)} placeholder="Or paste your brand rules here…" rows={5} className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 resize-y" />

            {formError && <div role="alert" className="rounded-lg border border-red-500 bg-red-500/20 px-3 py-2 text-xs text-red-800">{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Document Title</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="E.g., Brand Guidelines 2026"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || (!selectedFile && !guidelineText.trim())}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
            >
              {uploading ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Parsing & Storing in pgvector...</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Document Indexed!</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{selectedFile ? 'Analyze & Save Document' : 'Analyze & Save Text'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Guidelines List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Indexed Documents ({guidelines.length})</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <Database className="h-3.5 w-3.5" /> Stored for post reviews
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            </div>
          ) : guidelines.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No guidelines uploaded yet. Use the upload card on the left to index your first brand book.
            </div>
          ) : (
            <div className="space-y-2.5">
              {guidelines.map((g) => (
                <div key={g.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      {g.file_type === 'image/png' || g.file_type === 'image/jpeg' ? (
                        <ImageIcon className="h-4 w-4 text-cyan-600" />
                      ) : (
                        <FileCode className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{g.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Version: {g.version} • {g.chunk_count || 'Multi-rule'} vector chunks indexed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active & Searchable
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGuideline(g.id, g.name)}
                      disabled={deletingId === g.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete guideline"
                    >
                      {deletingId === g.id ? (
                        <div className="h-4 w-4 rounded-full border-2 border-rose-600 border-t-transparent animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
