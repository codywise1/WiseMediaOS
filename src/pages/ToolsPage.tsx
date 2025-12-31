import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Palette, FileImage, Layout, Type, FileText, Copy, Check } from 'lucide-react';

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [baseColor, setBaseColor] = useState('#3AA3EB');
  const [generatedPalette, setGeneratedPalette] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [transformedText, setTransformedText] = useState('');
  const [loremLength, setLoremLength] = useState(3);
  const [loremText, setLoremText] = useState('');

  function generatePalette() {
    const base = baseColor.replace('#', '');
    const r = parseInt(base.substr(0, 2), 16);
    const g = parseInt(base.substr(2, 2), 16);
    const b = parseInt(base.substr(4, 2), 16);

    const palette = [
      baseColor,
      `#${Math.min(255, r + 40).toString(16).padStart(2, '0')}${Math.min(255, g + 40).toString(16).padStart(2, '0')}${Math.min(255, b + 40).toString(16).padStart(2, '0')}`,
      `#${Math.max(0, r - 40).toString(16).padStart(2, '0')}${Math.max(0, g - 40).toString(16).padStart(2, '0')}${Math.max(0, b - 40).toString(16).padStart(2, '0')}`,
      `#${Math.min(255, Math.floor(r * 1.2)).toString(16).padStart(2, '0')}${Math.min(255, Math.floor(g * 0.8)).toString(16).padStart(2, '0')}${Math.min(255, Math.floor(b * 1.1)).toString(16).padStart(2, '0')}`,
      `#${Math.floor(r * 0.8).toString(16).padStart(2, '0')}${Math.floor(g * 1.2).toString(16).padStart(2, '0')}${Math.floor(b * 0.9).toString(16).padStart(2, '0')}`,
    ];

    setGeneratedPalette(palette);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function transformText(type: string) {
    switch (type) {
      case 'upper':
        setTransformedText(inputText.toUpperCase());
        break;
      case 'lower':
        setTransformedText(inputText.toLowerCase());
        break;
      case 'title':
        setTransformedText(inputText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()));
        break;
      case 'camel':
        setTransformedText(inputText.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, ''));
        break;
      case 'snake':
        setTransformedText(inputText.toLowerCase().replace(/\s+/g, '_'));
        break;
      case 'kebab':
        setTransformedText(inputText.toLowerCase().replace(/\s+/g, '-'));
        break;
    }
  }

  const loremSentences = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    'Nisi ut aliquip ex ea commodo consequat.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
    'Cillum dolore eu fugiat nulla pariatur.',
    'Excepteur sint occaecat cupidatat non proident.',
    'Sunt in culpa qui officia deserunt mollit anim id est laborum.',
  ];

  function generateLorem() {
    const paragraphs = [];
    for (let i = 0; i < loremLength; i++) {
      const paragraph = [];
      const sentenceCount = Math.floor(Math.random() * 3) + 3;
      for (let j = 0; j < sentenceCount; j++) {
        paragraph.push(loremSentences[Math.floor(Math.random() * loremSentences.length)]);
      }
      paragraphs.push(paragraph.join(' '));
    }
    setLoremText(paragraphs.join('\n\n'));
  }

  const tools = [
    { id: 'palette', icon: Palette, title: 'Color Palette Generator', description: 'Generate beautiful color schemes' },
    { id: 'webp', icon: FileImage, title: 'WebP Converter', description: 'Convert images to WebP format' },
    { id: 'mockup', icon: Layout, title: 'Logo Mockup Generator', description: 'Create professional logo mockups' },
    { id: 'text-case', icon: Type, title: 'Text Case Transformer', description: 'Transform text between cases' },
    { id: 'lorem', icon: FileText, title: 'Lorem Ipsum Generator', description: 'Generate placeholder text' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-white font-bold text-[40px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Creator Tools
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <GlassCard key={tool.id} className={`hover:scale-105 transition-all cursor-pointer ${activeTool === tool.id ? 'ring-2 ring-[#3AA3EB]' : ''}`} onClick={() => setActiveTool(tool.id)}>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#3AA3EB]/20 rounded-lg">
                <tool.icon className="text-[#3AA3EB]" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>{tool.title}</h3>
                <p className="text-gray-400 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>{tool.description}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {activeTool === 'palette' && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <Palette className="text-[#3AA3EB]" size={28} />
            <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color Palette Generator</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Base Color</label>
              <div className="flex gap-4">
                <input type="color" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} className="w-20 h-20 bg-black/30 border border-white/10 rounded-lg cursor-pointer" />
                <input type="text" value={baseColor} onChange={(e) => setBaseColor(e.target.value)} className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }} />
                <button onClick={generatePalette} className="px-8 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium shadow-lg shadow-[#3AA3EB]/20">
                  Generate
                </button>
              </div>
            </div>

            {generatedPalette.length > 0 && (
              <div>
                <h3 className="text-white font-bold mb-4" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Generated Palette</h3>
                <div className="grid grid-cols-5 gap-4">
                  {generatedPalette.map((color, i) => (
                    <div key={i} className="group relative">
                      <div className="aspect-square rounded-lg shadow-lg transition-transform hover:scale-110 cursor-pointer" style={{ backgroundColor: color }} onClick={() => copyToClipboard(color)} />
                      <div className="mt-2 text-center">
                        <p className="text-white font-bold number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: '14px' }}>{color}</p>
                        <button onClick={() => copyToClipboard(color)} className="text-[#3AA3EB] hover:text-[#2a92da] text-xs mt-1">
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {activeTool === 'text-case' && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <Type className="text-[#3AA3EB]" size={28} />
            <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Text Case Transformer</h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Input Text</label>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:border-[#3AA3EB] focus:ring-2 focus:ring-[#3AA3EB]/50 focus:outline-none h-32" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }} placeholder="Enter your text here..." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'UPPERCASE', value: 'upper' },
                { label: 'lowercase', value: 'lower' },
                { label: 'Title Case', value: 'title' },
                { label: 'camelCase', value: 'camel' },
                { label: 'snake_case', value: 'snake' },
                { label: 'kebab-case', value: 'kebab' },
              ].map((option) => (
                <button key={option.value} onClick={() => transformText(option.value)} className="px-4 py-3 bg-[#3AA3EB]/20 hover:bg-[#3AA3EB]/30 text-white rounded-lg transition-colors font-medium border border-[#3AA3EB]/30 hover:border-[#3AA3EB]">
                  {option.label}
                </button>
              ))}
            </div>
            {transformedText && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Output</label>
                  <button onClick={() => copyToClipboard(transformedText)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>
                  {transformedText}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {activeTool === 'lorem' && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-[#3AA3EB]" size={28} />
            <h2 className="text-white font-bold text-2xl" style={{ fontFamily: 'Montserrat, system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lorem Ipsum Generator</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-gray-300 mb-3" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Number of Paragraphs: <span className="number" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>{loremLength}</span></label>
                <input type="range" min="1" max="10" value={loremLength} onChange={(e) => setLoremLength(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
              </div>
              <button onClick={generateLorem} className="px-8 py-3 bg-[#3AA3EB] hover:bg-[#2a92da] text-white rounded-lg transition-colors font-medium shadow-lg shadow-[#3AA3EB]/20">
                Generate
              </button>
            </div>
            {loremText && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-gray-300" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px' }}>Generated Text</label>
                  <button onClick={() => copyToClipboard(loremText)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="px-4 py-4 bg-black/30 border border-white/10 rounded-lg text-gray-300 max-h-96 overflow-y-auto" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', lineHeight: '1.8' }}>
                  {loremText.split('\n\n').map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
