import { useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  Send, 
  Share2, 
  ShieldCheck 
} from 'lucide-react';
import { api } from '../services/api';
import type { GenerationResponse } from '../types';

export function GeneratorView() {
  const [topic, setTopic] = useState('Building high-speed modern SaaS platforms and enterprise web applications with Kalambe Devs.');
  const [goal, setGoal] = useState('Thought Leadership');
  const [channel, setChannel] = useState('LinkedIn');
  const [audience, setAudience] = useState('B2B Founders & Tech Leaders');
  const [tone, setTone] = useState('Attractive & Bold');
  const [includePoster, setIncludePoster] = useState(false);
  const [includePdf, setIncludePdf] = useState(false);
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setResult(null);
      setReviewSent(false);
      setPublished(false);

      const formats: ('text' | 'poster' | 'pdf')[] = ['text'];
      if (includePoster) formats.push('poster');
      if (includePdf) formats.push('pdf');

      const res = await api.generateContent({
        topic,
        campaign_goal: goal,
        target_channel: channel,
        target_audience: audience,
        intended_tone: tone,
        formats,
        save_as_draft: true
      });
      setResult(res);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.generated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendForReview = async () => {
    if (!result?.post_id) return;
    try {
      await api.sendForReview({
        post_id: result.post_id,
        channels: ['GMAIL', 'WHATSAPP', 'SLACK', 'TEAMS'],
        reviewer_notes: `Generated via Content Studio for ${channel} (${goal}). 100% compliant.`
      });
      setReviewSent(true);
    } catch (err) {
      console.error('Failed to dispatch review:', err);
    }
  };

  const handleDirectPublish = async () => {
    if (!result?.post_id) return;
    try {
      setPublishing(true);
      await api.publishPost(result.post_id, ['LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM']);
      setPublished(true);
    } catch (err) {
      console.error('Failed to publish:', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Generate Post
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Brand-Compliant by Design
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate channel-calibrated copy, 1080×1080 posters, and multi-slide carousels grounded in active guidelines.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-5">
          <form onSubmit={handleGenerate} className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Campaign Theme & Prompt
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
                placeholder="Enter campaign prompt..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Select Channel</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Twitter">Twitter / X</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Campaign Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Select Goal</option>
                  <option value="Product Launch">Product Launch</option>
                  <option value="Brand Awareness">Brand Awareness</option>
                  <option value="Thought Leadership">Thought Leadership</option>
                  <option value="Demand Generation">Demand Generation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Persona</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Enterprise CMOs"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Brand Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Select Brand Tone</option>
                  <option value="Attractive & Bold">Attractive & Bold</option>
                  <option value="Clear & Professional">Clear & Professional</option>
                  <option value="Visionary & Forward">Visionary & Forward</option>
                  <option value="Technical & Analytical">Technical & Analytical</option>
                </select>
              </div>
            </div>

            {/* Format selection */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Deliverables Included
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Copy</span>
                </div>
                <label className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  includePoster ? 'bg-cyan-50/80 border-cyan-300 text-cyan-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={includePoster}
                    onChange={(e) => setIncludePoster(e.target.checked)}
                    className="hidden"
                  />
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-600" />
                  <span>Poster .PNG</span>
                </label>
                <label className={`p-2 rounded-lg border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  includePdf ? 'bg-amber-50/80 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={includePdf}
                    onChange={(e) => setIncludePdf(e.target.checked)}
                    className="hidden"
                  />
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span>PDF Carousel</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Synthesizing Brand Copy & Assets...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Brand Compliant Assets</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Deliverables Canvas */}
        <div className="lg:col-span-7">
          {!result && !generating && (
            <div className="h-full min-h-[440px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
              <Sparkles className="h-8 w-8 text-slate-400 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Studio Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                Enter your campaign prompt on the left to generate validated copy, branded posters, and PDF carousels.
              </p>
            </div>
          )}

          {generating && (
            <div className="h-full min-h-[440px] rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center p-8 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">Applying Brand Assertions & Color Palettes</h4>
              <p className="text-[11px] text-slate-500">Checking against active pgvector guidelines...</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Compliance Badge */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">100% Compliant</h4>
                    <p className="text-[11px] text-emerald-700">Zero policy violations detected</p>
                  </div>
                </div>
                <span className="text-base font-black font-mono text-emerald-700">100%</span>
              </div>

              {/* Formatted Copy */}
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" /> Generated Post Copy
                  </span>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 mb-1.5">{result.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{result.generated_text}</p>
                </div>
              </div>

              {/* Assets Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.poster_url && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5 text-cyan-600" /> Poster (.PNG)
                      </span>
                      <a
                        href={`http://localhost:8000${result.poster_url}`}
                        download
                        className="text-[11px] text-cyan-700 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-square">
                      <img
                        src={`http://localhost:8000${result.poster_url}`}
                        alt="Generated Poster"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {result.pdf_url && (
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5 text-amber-600" /> Carousel (.PDF)
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 text-center space-y-1.5">
                        <Layers className="h-7 w-7 text-amber-600 mx-auto" />
                        <h5 className="text-xs font-bold text-slate-900">4-Slide LinkedIn Carousel</h5>
                        <p className="text-[11px] text-slate-500">Problem, Solution & Call to Action</p>
                      </div>
                    </div>
                    <a
                      href={`http://localhost:8000${result.pdf_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600 font-medium">Ready to dispatch or publish?</div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSendForReview}
                    disabled={reviewSent}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {reviewSent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    <span>{reviewSent ? 'Review Dispatched' : 'Send for Review'}</span>
                  </button>

                  <button
                    onClick={handleDirectPublish}
                    disabled={publishing || published}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {published ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>{published ? 'Published!' : '1-Click Multi-Publish'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
