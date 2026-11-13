import { useState, useRef } from 'react';
import { api } from '../services/api';
import { 
  Building2, 
  BookOpen, 
  Share2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  UploadCloud, 
  Sparkles, 
  ShieldCheck, 
  X,
  Trash2,
  Plus,
  FileDown
} from 'lucide-react';

export interface OnboardingPayload {
  companyName: string;
  industry: string;
  brandTones: string[];
  rulesText: string;
  analysisStatus: 'ready' | 'needs_clarification' | 'empty';
  analysisMessage?: string;
  channels: string[];
  docNames: string[];
  uploadedFiles?: File[];
}

interface OnboardingViewProps {
  initialData: { email: string; name: string; org: string };
  onComplete: (data: OnboardingPayload) => Promise<void> | void;
}

const AVAILABLE_TONES = [
  { name: 'Attractive & Bold', tag: 'B2B Enterprise', desc: 'Direct, confident, industry leadership' },
  { name: 'Clear & Professional', tag: 'Corporate', desc: 'Precise, trustworthy, executive standard' },
  { name: 'Visionary & Inspiring', tag: 'Thought Leader', desc: 'Forward-looking, motivating, high-impact' },
  { name: 'Conversational & Engaging', tag: 'Modern Social', desc: 'Approachable, warm, audience-centric' },
  { name: 'Educational & Instructive', tag: 'SaaS / Guides', desc: 'Helpful, structured, insightful clarity' },
  { name: 'Empathetic & Human', tag: 'Support & Values', desc: 'Authentic, caring, community-first' },
  { name: 'Technical & Data-Driven', tag: 'Engineering & R&D', desc: 'Analytical, factual, evidence-based' },
  { name: 'Minimalist & Direct', tag: 'Product First', desc: 'Concise, clean, zero fluff' }
];

const AVAILABLE_CHANNELS = [
  { id: 'LinkedIn', desc: 'Social & Articles', badge: 'Publishing' },
  { id: 'Twitter', desc: 'Campaign launches & threads', badge: 'Publishing' },
  { id: 'Slack', desc: 'Team review notifications', badge: 'Review Hub' },
  { id: 'Gmail', desc: 'Executive sign-offs', badge: 'Review Hub' },
  { id: 'Teams', desc: 'Connector cards & updates', badge: 'Review Hub' },
  { id: 'Instagram', desc: 'Visual creatives & reels', badge: 'Publishing' }
];

export function OnboardingView({ initialData, onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState(1);
  
  // If demo account, pre-fill all 4 steps so judges only need to click 'Continue'
  const isDemo = initialData.email === 'demo@fixora.ai' || initialData.email?.includes('demo');

  const [companyName, setCompanyName] = useState(
    initialData.org || (isDemo ? 'Fixora Brand Lab' : '')
  );
  const [industry, setIndustry] = useState(
    isDemo ? 'Enterprise B2B SaaS & Cloud Software' : ''
  );
  const [selectedTones, setSelectedTones] = useState<string[]>(
    isDemo ? ['Attractive & Bold', 'Clear & Professional'] : []
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    isDemo ? ['LinkedIn', 'Twitter', 'Slack', 'Gmail', 'Teams'] : []
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [rulesText, setRulesText] = useState(
    isDemo
      ? `We build high-performance brand governance and scalable B2B SaaS applications.\n` +
        `Tone of Voice: Attractive & bold, yet clear & professional. Lead with authoritative, high-impact hooks.\n` +
        `Prohibited Content: Never name, attack, or negatively compare competitors directly.\n` +
        `Legal Claims: Never make absolute compliance guarantees without higher-up approval.\n` +
        `Technical Standards: Always cite measurable metrics (e.g. latency, compliance score, throughput).\n` +
        `Visual & Branding: Primary color token is #009DFF with high typographical contrast.\n` +
        `Social Distribution: Keep posts engaging with 2-4 relevant hashtags.`
      : ''
  );
  const [analyzedRules, setAnalyzedRules] = useState<any[]>([]);
  const [analyzingRules, setAnalyzingRules] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle tone on/off
  const toggleTone = (toneName: string) => {
    if (selectedTones.includes(toneName)) {
      setSelectedTones(selectedTones.filter((t) => t !== toneName));
    } else {
      setSelectedTones([...selectedTones, toneName]);
    }
  };

  // Toggle channel on/off
  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  // Handle real file selection from user device (up to 5 documents)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setUploadedFiles((prev) => {
        const remainingSlots = 5 - prev.length;
        if (remainingSlots <= 0) return prev;
        return [...prev, ...selected.slice(0, remainingSlots)];
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = async () => {
    if (step < 4) {
      if (step === 3) {
        await analyzeGuidelines();
      }
      setStep(step + 1);
    } else {
      setSubmitting(true);
      try { await onComplete({
        companyName: companyName.trim() || initialData.org || '',
        industry: industry.trim() || '',
        brandTones: selectedTones,
        rulesText: analyzedRules.length
          ? analyzedRules.map((rule) => `${rule.title}: ${rule.rule_text}`).join('\n')
          : rulesText,
        analysisStatus: analysisError ? 'needs_clarification' : (rulesText.trim() || uploadedFiles.length ? 'ready' : 'empty'),
        analysisMessage: analysisError,
        channels: selectedChannels,
        docNames: uploadedFiles.map((f) => f.name),
        uploadedFiles: uploadedFiles
      }); } catch (err) { setAnalysisError(err instanceof Error ? err.message : 'Could not save your guidelines. Please retry.'); }
      finally { setSubmitting(false); }
    }
  };

  const analyzeGuidelines = async () => {
    setAnalysisError('');
    if (!rulesText.trim()) return;
    setAnalyzingRules(true);
    try {
      const result = await api.analyzeTextRules(rulesText, companyName);
      setAnalyzedRules(result.rules || []);
      if (!result.rules?.length || result.needs_clarification) {
        setAnalysisError(result.message || 'The guidelines do not contain enough specific direction to confidently judge posts. Add clear rules about claims, tone, and restricted content.');
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Guideline analysis could not be completed. Add clear rules about tone, claims, and restricted content.');
    } finally { setAnalyzingRules(false); }
  };

  const loadSampleGuidelines = () => {
    setRulesText(
      `We build high-performance web applications, mobile apps, and scalable B2B SaaS.\n` +
      `Tone of Voice: Attractive & bold, yet clear & professional. Always lead with strong, scroll-stopping hooks.\n` +
      `Prohibited Content: Never name, attack, or negatively compare competitor agencies or tools.\n` +
      `Legal Claims: Never guarantee absolute financial returns or 100% bug-free uptime without client sign-off.\n` +
      `Technical Standards: Always cite concrete metrics (e.g. latency, conversion rate, throughput).\n` +
      `Formatting: Use maximum 3-4 hashtags per post (#B2BSaaS #WebDevelopment #SoftwareEngineering).`
    );
  };

  const handleAddRule = () => {
    setAnalyzedRules((prev) => [
      ...prev,
      {
        title: `Custom Rule ${prev.length + 1}`,
        category: 'GENERAL',
        rule_text: '',
        severity: 'WARNING'
      }
    ]);
  };

  const handleDeleteRule = (index: number) => {
    setAnalyzedRules((prev) => prev.filter((_, i) => i !== index));
  };

  // Format file size helper
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen w-screen bg-[#ffffff] flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-xl">
        {/* Header with Steps */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img
              src="/fixoraailogo.jpeg"
              alt="Logo"
              className="h-10 w-10 rounded-xl object-cover shadow-xs border border-[#D1DCE5]"
            />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Workspace Setup</h2>
              <p className="text-[11px] text-slate-500">Step {step} of 4</p>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  backgroundColor: step === s ? '#009DFF' : step > s ? '#10B981' : '#CBD5E1'
                }}
                className={`h-2 rounded-full transition-all ${
                  step === s ? 'w-6' : 'w-2'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Card */}
        <div className="bg-[#E4EBF2] border border-[#D1DCE5] rounded-2xl p-8 shadow-sm space-y-6">
          {/* STEP 1: Company Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-800" />
                  Tell us about your organization
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  FixoraAI will calibrate compliance rules to your industry and brand standards.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Primary Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#009DFF] cursor-pointer"
                  >
                    <option value="">Select your industry...</option>
                    <option value="Enterprise B2B SaaS & Cloud Software">Enterprise B2B SaaS & Cloud Software</option>
                    <option value="FinTech, Banking & Financial Services">FinTech, Banking & Financial Services</option>
                    <option value="Healthcare, Biotech & Pharmaceuticals">Healthcare, Biotech & Pharmaceuticals</option>
                    <option value="E-Commerce, Direct-to-Consumer & Retail">E-Commerce, Direct-to-Consumer & Retail</option>
                    <option value="Artificial Intelligence & DeepTech">Artificial Intelligence & DeepTech</option>
                    <option value="Cybersecurity & Enterprise Infrastructure">Cybersecurity & Enterprise Infrastructure</option>
                    <option value="Marketing, Advertising & PR Agencies">Marketing, Advertising & PR Agencies</option>
                    <option value="Media, Entertainment & Publishing">Media, Entertainment & Publishing</option>
                    <option value="EdTech & Educational Institutions">EdTech & Educational Institutions</option>
                    <option value="Real Estate, Architecture & PropTech">Real Estate, Architecture & PropTech</option>
                    <option value="LegalTech & Corporate Governance">LegalTech & Corporate Governance</option>
                    <option value="Travel, Hospitality & Aviation">Travel, Hospitality & Aviation</option>
                    <option value="Automotive & Clean Energy Tech">Automotive & Clean Energy Tech</option>
                    <option value="Manufacturing & Industrial Logistics">Manufacturing & Industrial Logistics</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Brand tone */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-800" />
                  Define your brand tone
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose the voice employees should use when writing company posts.</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Tone of voice (choose any)</label>
                  <span className="text-[10px] text-slate-500">{selectedTones.length ? `${selectedTones.length} selected` : 'Optional'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {AVAILABLE_TONES.map((tone) => {
                    const selected = selectedTones.includes(tone.name);
                    return <button key={tone.name} type="button" onClick={() => toggleTone(tone.name)} style={{borderColor: selected ? '#009DFF' : '#CBD5E1', backgroundColor: selected ? '#ffffff' : 'rgba(255,255,255,.6)'}} className={`p-2.5 rounded-lg border text-left flex items-start justify-between gap-2 ${selected ? 'ring-1 ring-[#009DFF]' : ''}`}>
                      <span><span className="block text-xs font-bold text-slate-900">{tone.name}</span><span className="block text-[10px] text-slate-500 mt-0.5">{tone.desc}</span></span>
                      <span className="h-4 w-4 rounded-full border flex items-center justify-center shrink-0" style={{backgroundColor: selected ? '#009DFF' : 'transparent', borderColor: selected ? '#009DFF' : '#CBD5E1'}}>{selected && <Check className="h-2.5 w-2.5 text-white" />}</span>
                    </button>;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Editable rules */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-800" />
                  Add your rules & guidelines
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type or paste your brand guidelines in plain text. FixoraAI extracts specific, actionable rules that you can freely edit, re-categorize, or adjust.
                </p>
              </div>

              {/* Quick Action Helpers */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleGuidelines}
                  className="px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] hover:border-[#009DFF] text-slate-700 hover:text-[#009DFF] text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Fills with sample B2B guidelines"
                >
                  <span>⚡ Load Sample Guidelines</span>
                </button>

                <a
                  href="/Brand_Guidelines.pdf"
                  download="Brand_Guidelines.pdf"
                  className="px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] hover:border-emerald-500 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Download the official 4-page PDF"
                >
                  <FileDown className="h-3 w-3 text-emerald-600" />
                  <span>Download Brand Guidelines PDF</span>
                </a>
              </div>

              {/* Text Area */}
              <div>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="Paste or write your guidelines here. E.g.: Tone must be attractive & bold yet clear & professional. Never name or disparage competitors. Always support claims with measurable engineering ROI. Max 3-4 hashtags."
                  rows={5}
                  className="w-full px-3 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#009DFF] resize-y"
                />

                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={analyzeGuidelines}
                    disabled={analyzingRules || !rulesText.trim()}
                    style={{ backgroundColor: '#6366F1' }}
                    className="px-3.5 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${analyzingRules ? 'animate-spin' : ''}`} />
                    <span>{analyzingRules ? 'Extracting Rules with AI...' : '✨ Analyze & Extract Rules with AI'}</span>
                  </button>

                  {analyzedRules.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#CBD5E1] hover:border-[#6366F1] text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#6366F1]" />
                      <span>Add Rule</span>
                    </button>
                  )}
                </div>
              </div>

              {analysisError && <p role="alert" className="text-xs text-amber-700">{analysisError}</p>}

              {/* Extracted & Changeable Rules */}
              {analyzedRules.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {analyzedRules.length} Extracted Rules (100% Changeable)
                    </span>
                    <span className="text-[10px] text-slate-500">Edit fields, category, or delete</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {analyzedRules.map((rule, index) => (
                      <div key={`${index}-${rule.title}`} className="p-3 bg-white rounded-xl border border-[#CBD5E1] space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={rule.title || ''}
                            onChange={(e) => setAnalyzedRules((all) => all.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}
                            placeholder="Rule Title"
                            className="flex-1 text-xs font-bold text-slate-900 px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                          />

                          <select
                            value={rule.category || 'GENERAL'}
                            onChange={(e) => setAnalyzedRules((all) => all.map((item, i) => i === index ? { ...item, category: e.target.value } : item))}
                            className="text-[10px] font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 cursor-pointer"
                          >
                            <option value="TONE_OF_VOICE">Tone of Voice</option>
                            <option value="COMPETITOR_POLICY">Competitor Policy</option>
                            <option value="LEGAL_CLAIMS">Legal & Claims</option>
                            <option value="TYPOGRAPHY">Typography</option>
                            <option value="COLOR_PALETTE">Color Palette</option>
                            <option value="GENERAL">General Standard</option>
                          </select>

                          <select
                            value={rule.severity || 'WARNING'}
                            onChange={(e) => setAnalyzedRules((all) => all.map((item, i) => i === index ? { ...item, severity: e.target.value } : item))}
                            className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${
                              rule.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              rule.severity === 'SUGGESTION' ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <option value="CRITICAL">Critical</option>
                            <option value="WARNING">Warning</option>
                            <option value="SUGGESTION">Suggestion</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Delete this rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <textarea
                          value={rule.rule_text || ''}
                          onChange={(e) => setAnalyzedRules((all) => all.map((item, i) => i === index ? { ...item, rule_text: e.target.value } : item))}
                          placeholder="Actionable rule directive..."
                          rows={2}
                          className="w-full text-xs text-slate-700 px-2 py-1 bg-slate-50 border border-slate-200 rounded resize-y"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              <div className="border-t border-[#CBD5E1] pt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Upload supporting guideline documents (optional)
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">{uploadedFiles.length} / 5</span>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.md" onChange={handleFileChange} className="hidden" />
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#CBD5E1]">
                        <span className="text-xs truncate">{file.name} · {formatFileSize(file.size)}</span>
                        <button type="button" onClick={(e) => handleRemoveFile(idx, e)} className="text-slate-500 hover:text-rose-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {uploadedFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 rounded-lg bg-white border border-dashed border-[#CBD5E1] text-xs text-slate-700 hover:border-[#009DFF] transition-colors cursor-pointer"
                  >
                    <UploadCloud className="h-4 w-4 inline mr-1 text-[#009DFF]" />
                    <span>Choose files (PDF, image, TXT, Markdown)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Channels */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-slate-800" />
                  Select your active channels
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Pick the platforms your team publishes to or reviews drafts on.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {AVAILABLE_CHANNELS.map((ch) => {
                  const active = selectedChannels.includes(ch.id);
                  return <div key={ch.id} onClick={() => toggleChannel(ch.id)} style={{borderColor: active ? '#009DFF' : '#CBD5E1', backgroundColor: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'}} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all hover:bg-white ${active ? 'ring-1 ring-[#009DFF] shadow-2xs' : ''}`}><div><div className="text-xs font-bold text-slate-900">{ch.id}</div><div className="text-[10px] text-slate-500">{ch.desc}</div></div><div className="h-4 w-4 rounded border flex items-center justify-center text-white" style={{backgroundColor: active ? '#009DFF' : 'transparent', borderColor: active ? '#009DFF' : '#CBD5E1'}}>{active && <Check className="h-3 w-3" />}</div></div>;
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#CBD5E1]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #CBD5E1'
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer hover:bg-slate-50"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              style={{
                backgroundColor: '#009DFF',
                color: '#ffffff'
              }}
              className="px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:opacity-90 ml-auto"
            >
              <span>{submitting ? 'Saving guidelines…' : step === 4 ? 'Launch Fixora Workspace' : 'Continue'}</span>
              {step === 4 ? <Sparkles className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-4 text-center mt-6 text-slate-500">
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[11px] font-medium">Automatic Rule Citations</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="h-4 w-4 text-slate-800" />
            <span className="text-[11px] font-medium">1-Click AI Suggested Fixes</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Share2 className="h-4 w-4 text-cyan-600" />
            <span className="text-[11px] font-medium">Multi-Channel Direct Push</span>
          </div>
        </div>
      </div>
    </div>
  );
}
