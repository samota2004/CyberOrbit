import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Lock, 
  Cpu, 
  BrainCircuit, 
  Activity, 
  ArrowRight, 
  Server, 
  Layers, 
  Database, 
  Terminal, 
  Radio, 
  Mail, 
  Send, 
  Sun, 
  Moon, 
  CheckCircle2, 
  Zap,
  Network,
  Eye,
  AlertTriangle,
  GitBranch,
  Fingerprint,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LandingPage = ({ onLogin, onEnterDashboard, onNavigateToLogin, onExplorePlatform }) => {
  const { isDark, toggleTheme } = useTheme();
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', organization: '', message: '' });

  const handleLoginClick = () => {
    if (onNavigateToLogin) onNavigateToLogin();
    else if (onLogin) onLogin();
  };

  const handleExploreClick = () => {
    const el = document.getElementById('about');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (onExplorePlatform) {
      onExplorePlatform();
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactForm.name && contactForm.email) {
      setContactSubmitted(true);
      setTimeout(() => {
        setContactSubmitted(false);
        setContactForm({ name: '', email: '', organization: '', message: '' });
      }, 5000);
    }
  };

  // Section 4 Technologies
  const technologies = [
    { name: 'React', category: 'Frontend', desc: 'Reactive state management with dynamic SOC visualizations' },
    { name: 'Node.js', category: 'Runtime', desc: 'Event-driven high-throughput runtime for enterprise telemetry' },
    { name: 'Express', category: 'API Gateway', desc: 'RESTful security endpoints and policy enforcement routing' },
    { name: 'JavaScript', category: 'Core Language', desc: 'Full-stack unified modern JavaScript architecture' },
    { name: 'Random Forest', category: 'Supervised ML', desc: '25 decision trees trained on multi-vector security telemetry' },
    { name: 'Isolation Forest', category: 'Anomaly Detection', desc: 'Unsupervised tree partitioning for unknown zero-day anomalies' },
    { name: 'PostgreSQL', category: 'Database', desc: 'Relational ACID telemetry storage with index optimization' },
    { name: 'Prisma', category: 'ORM', desc: 'Type-safe data modeling and structured query transactions' },
    { name: 'Tailwind CSS', category: 'Design System', desc: 'Custom luxury editorial design system with precise typography' },
    { name: 'REST API', category: 'Integration', desc: 'Open enterprise endpoints for SIEM and SOAR orchestration' },
    { name: 'Server-Sent Events', category: 'Streaming', desc: 'Unidirectional real-time telemetry streaming directly to client' },
    { name: 'Zero Trust', category: 'Architecture', desc: 'NIST SP 800-207 continuous verification & adaptive policy' },
    { name: 'MITRE ATT&CK', category: 'Threat Model', desc: 'Standardized tactics and technique mapping across incidents' },
  ];

  // Section 5 Capabilities
  const capabilities = [
    {
      num: '01',
      title: 'Continuous Monitoring',
      desc: 'Never rely on initial perimeter authentication. CyberOrbit captures every interaction across endpoints, identities, internal networks, and data volumes in sub-second intervals.'
    },
    {
      num: '02',
      title: 'Behavioral Intelligence',
      desc: 'Builds individual dynamic baselines for every employee—learning typical working hours, data egress rates, normal department resources, and CLI command execution.'
    },
    {
      num: '03',
      title: 'AI Risk Detection',
      desc: 'Dual-model machine learning ensemble pairing Supervised Random Forest with Unsupervised Isolation Forest to detect both known attacks and subtle unknown deviations.'
    },
    {
      num: '04',
      title: 'Explainable AI (XAI)',
      desc: 'No black-box decisions. Analysts receive SHAP-inspired feature attribution detailing exactly why an activity triggered risk with human-interpretable severity ratings.'
    },
    {
      num: '05',
      title: 'Adaptive Zero Trust',
      desc: 'Dynamic Policy Decision Point (PDP) translates computed risk into real-time actions: progressive MFA challenges, session restriction, supervisor approval, or instant freeze.'
    },
    {
      num: '06',
      title: 'Automated Incident Response',
      desc: 'Instantly correlates anomalous telemetry into structured security incidents mapped against the MITRE ATT&CK matrix with full chronological forensic audit trails.'
    }
  ];

  const team = [
    {
      name: 'Priyanka Samota',
      role: 'Project Lead & ML Engineer',
      responsibility:
        'Led the overall project development, including system architecture, ML model training, feature engineering, Zero Trust policy design, backend integration, and frontend implementation.',
      initials: 'PS'
    },
    {
      name: 'Sangamesh Kaji',
      role: 'Full-Stack Development Support',
      responsibility:
        'Assisted with full-stack implementation, backend integration, debugging, and development tasks based on the project requirements.',
      initials: 'SK'
    },
    {
      name: 'Kanaparthi Nishitha',
      role: 'Cybersecurity Research Analyst',
      responsibility:
        'Conducted cybersecurity research, studied insider threat scenarios, UEBA concepts, and contributed research inputs for threat detection and security policies.',
      initials: 'KN'
    },
    {
      name: 'Jayant',
      role: 'Testing & Project Support',
      responsibility:
        'Supported application testing, feature validation, documentation, and overall team coordination during the project development.',
      initials: 'JB'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#07080A] text-[#F4F4F6]' : 'bg-[#F9F9F7] text-[#111317]'}`}>
      {/* Editorial Top Navigation */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-[#07080A]/85 border-[#D4AF37]/20' : 'bg-[#F9F9F7]/90 border-[#C5A059]/25'
      }`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          {/* CyberOrbit Editorial Wordmark */}
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 border border-[#D4AF37] flex items-center justify-center relative rotate-45 group">
              <div className="w-3 h-3 bg-[#D4AF37] transition-transform duration-500 group-hover:rotate-45" />
            </div>
            <div>
              <span className="font-serif-display text-2xl tracking-[0.2em] font-semibold block leading-none">
                CYBERORBIT
              </span>
              <span className="text-[10px] tracking-[0.25em] text-[#D4AF37] uppercase font-sans font-medium block mt-1">
                Zero Trust &amp; UEBA Security
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-10 text-xs tracking-[0.18em] uppercase font-medium">
            <a href="#about" className="transition-colors hover:text-[#D4AF37]">About</a>
            <a href="#architecture" className="transition-colors hover:text-[#D4AF37]">Architecture</a>
            <a href="#technologies" className="transition-colors hover:text-[#D4AF37]">Technologies</a>
            <a href="#capabilities" className="transition-colors hover:text-[#D4AF37]">Capabilities</a>
            <a href="#ai-security" className="transition-colors hover:text-[#D4AF37]">AI Engine</a>
            <a href="#team" className="transition-colors hover:text-[#D4AF37]">Team</a>
            <a href="#contact" className="transition-colors hover:text-[#D4AF37]">Contact</a>
          </nav>

          {/* Actions: Theme Toggle & Secure Login */}
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme} 
              className={`p-2.5 rounded-none border transition-colors cursor-pointer ${
                isDark 
                  ? 'border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10' 
                  : 'border-[#C5A059]/40 text-[#B8860B] hover:bg-[#B8860B]/10'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              id="btn-nav-admin-login"
              onClick={handleLoginClick}
              className="px-5 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase border border-[#D4AF37] bg-transparent text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-300 cursor-pointer flex items-center gap-2"
            >
              <span>SECURE ADMIN LOGIN</span>
              <span className="font-serif">→</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO (Large Editorial Layout) */}
      <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 overflow-hidden border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <span className="w-6 h-[1px] bg-[#D4AF37]" />
            <span className="text-[11px] font-sans font-semibold tracking-[0.3em] uppercase text-[#D4AF37]">
              ZERO TRUST • UEBA • AI SECURITY
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left: Headline & Statement */}
            <div className="lg:col-span-6 space-y-8">
              <h1 className="font-serif-display text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05]">
                CYBERORBIT
                <span className="block font-sans text-xl sm:text-2xl font-light tracking-[0.12em] text-[#C6A14A] mt-4 leading-snug">
                  Zero Trust Security.<br className="hidden sm:inline" />
                  Intelligent Insider Threat Detection.
                </span>
              </h1>

              <div className="w-24 h-[1px] bg-[#C6A14A]" />

              <p className={`text-base sm:text-lg font-light leading-relaxed max-w-xl ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                CyberOrbit continuously monitors user behavior, device trust, telemetry, risk signals and security events to detect insider threats and enforce Zero Trust policies.
              </p>

              {/* Minimal Buttons with thin gold borders */}
              <div className="flex flex-wrap items-center gap-5 pt-2">
                <button
                  id="btn-hero-admin-login"
                  onClick={handleLoginClick}
                  className="px-8 py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#C6A14A] bg-[#C6A14A] text-black hover:bg-transparent hover:text-[#C6A14A] transition-all duration-300 cursor-pointer flex items-center gap-3 shadow-[0_0_20px_rgba(198,161,74,0.15)]"
                >
                  <span>SECURE LOGIN</span>
                  <span className="font-serif text-sm">→</span>
                </button>

                <button
                  id="btn-hero-explore-platform"
                  onClick={handleExploreClick}
                  className={`px-8 py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border transition-all duration-300 cursor-pointer ${
                    isDark 
                      ? 'border-[#C6A14A]/40 text-gray-200 hover:border-[#C6A14A] hover:text-[#C6A14A] bg-[#0E0E0E]' 
                      : 'border-[#E5E5E5] text-gray-900 hover:border-[#C6A14A] hover:text-[#C6A14A] bg-white'
                  }`}
                >
                  EXPLORE PLATFORM
                </button>
              </div>

              {/* Key Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-[#2A2A2A]">
                <div>
                  <div className="font-serif-display text-2xl sm:text-3xl font-light text-[#C6A14A]">15,000+</div>
                  <div className="text-[10px] font-mono tracking-[0.15em] uppercase text-gray-400 mt-1">Telemetry Logs</div>
                </div>
                <div>
                  <div className="font-serif-display text-2xl sm:text-3xl font-light text-[#C6A14A]">98.8%</div>
                  <div className="text-[10px] font-mono tracking-[0.15em] uppercase text-gray-400 mt-1">Ensemble Accuracy</div>
                </div>
                <div>
                  <div className="font-serif-display text-2xl sm:text-3xl font-light text-[#C6A14A]">&lt;15ms</div>
                  <div className="text-[10px] font-mono tracking-[0.15em] uppercase text-gray-400 mt-1">Inference Latency</div>
                </div>
              </div>
            </div>

            {/* Right: Exact 5-Step Pipeline Visual Representation */}
            <div className="lg:col-span-6 flex justify-center">
              <div className={`w-full max-w-lg p-6 sm:p-8 border border-[#2A2A2A] relative flex flex-col justify-between ${
                isDark ? 'bg-[#0E0E0E]' : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-xl'
              }`}>
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#C6A14A]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#C6A14A]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#C6A14A]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#C6A14A]" />

                {/* Top Readout */}
                <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3 mb-5">
                  <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-[#C6A14A]">
                    ZERO TRUST DEFENSE PIPELINE
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A14A] animate-ping" />
                    <span className="text-[10px] font-mono text-gray-400">REAL-TIME</span>
                  </div>
                </div>

                {/* 5-Step Flow: Telemetry ↓ ML Detection ↓ Risk Analysis ↓ Zero Trust Policy ↓ Incident Response */}
                <div className="space-y-2.5 my-1 font-mono">
                  {[
                    { step: '01', title: 'Telemetry', desc: 'Auth, Device, Network, Activity Streams', tag: 'INPUT' },
                    { step: '02', title: 'ML Detection', desc: 'Random Forest & Isolation Forest', tag: 'INFERENCE' },
                    { step: '03', title: 'Risk Analysis', desc: 'Dynamic Trust Decay & Factor Attribution', tag: 'SCORING' },
                    { step: '04', title: 'Zero Trust Policy', desc: 'Continuous Verification Decision Point', tag: 'ENFORCEMENT' },
                    { step: '05', title: 'Incident Response', desc: 'MITRE ATT&CK & Automated Containment', tag: 'CONTAINMENT' }
                  ].map((node, i, arr) => (
                    <React.Fragment key={node.step}>
                      <div className={`p-3.5 border transition-all duration-200 group flex items-center justify-between ${
                        isDark 
                          ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]' 
                          : 'bg-[#F7F4EC] border-[#E5E5E5] hover:border-[#C6A14A]'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#C6A14A] font-bold">{node.step}</span>
                          <div>
                            <div className="text-xs font-semibold text-current flex items-center gap-2">
                              <span>{node.title}</span>
                              <span className="text-[9px] px-1.5 py-0.2 border border-[#C6A14A]/40 text-[#C6A14A] uppercase">
                                {node.tag}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{node.desc}</div>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full border border-[#C6A14A] bg-[#C6A14A]/20 shrink-0" />
                      </div>

                      {i < arr.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <span className="text-[#C6A14A] text-xs font-bold leading-none">↓</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Bottom Readout */}
                <div className="pt-4 border-t border-[#2A2A2A] mt-5 flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span>LATENCY: &lt;15ms</span>
                  <span className="text-[#C6A14A]">ADAPTIVE ZERO TRUST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ABOUT CYBERORBIT (Editorial Two-Column) */}
      <section id="about" className="py-24 md:py-36 border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left Column: Large Editorial Heading */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37] block">
                01 / PHILOSOPHY
              </span>
              <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]">
                Security that understands behavior.
              </h2>
              <div className="w-20 h-[1px] bg-[#D4AF37]" />
              <p className="text-sm font-sans text-gray-400 leading-relaxed max-w-md">
                Static access credentials and perimeter firewalls are insufficient against modern lateral movement, compromised session tokens, and malicious insiders.
              </p>
            </div>

            {/* Right Column: In-depth Editorial Content */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.1 — ZERO TRUST</div>
                <h3 className="font-serif-display text-2xl font-light">Never Trust, Always Verify</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Every transaction, download request, and authentication is continuously validated against dynamic context rather than static network location.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.2 — UEBA</div>
                <h3 className="font-serif-display text-2xl font-light">Behavioral Intelligence</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Deep baselining calculates statistical variances across employee working hours, egress volumes, privileged commands, and typical resources.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.3 — INSIDER THREATS</div>
                <h3 className="font-serif-display text-2xl font-light">Privilege Abuse Detection</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Detects anomalous cross-department browsing, off-hours exfiltration, rapid failed escalations, and unapproved hardware attachments.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.4 — MACHINE LEARNING</div>
                <h3 className="font-serif-display text-2xl font-light">Dual-Layer ML Ensemble</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Synergy of 25-tree Random Forest classification and 100-tree Isolation Forest anomaly scoring provides robust threat classification.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.5 — RISK ASSESSMENT</div>
                <h3 className="font-serif-display text-2xl font-light">Continuous Dynamic Scoring</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Trust decays proportionally under anomalous telemetry, requiring continuous behavioral compliance to regain normal status.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.6 — EXPLAINABLE AI</div>
                <h3 className="font-serif-display text-2xl font-light">Transparent Attribution</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Direct decomposition of factors explaining exact risk causes—ensuring security analysts have instant, auditable forensic rationale.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.7 — DEVICE TRUST</div>
                <h3 className="font-serif-display text-2xl font-light">Hardware Posture Validation</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Continuous endpoint posture attestation, disk encryption verification, and security patch auditing before any resource transaction is authorized.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.8 — POLICY ENFORCEMENT</div>
                <h3 className="font-serif-display text-2xl font-light">Adaptive Zero Trust Rules</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Automated containment triggers step-up MFA, restricts high-risk permissions, or enforces immediate account freeze when anomaly thresholds breach.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-[#D4AF37] tracking-wider">01.9 — REAL-TIME MONITORING</div>
                <h3 className="font-serif-display text-2xl font-light">Telemetry Stream Ingestion</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  High-throughput Server-Sent Events (SSE) telemetry pipeline processes user access logs, ML anomaly inferences, and SOC containment signals with sub-15ms latency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW CYBERORBIT WORKS (Large Visual Architecture) */}
      <section id="architecture" className={`py-24 md:py-36 border-b border-[#D4AF37]/20 ${isDark ? 'bg-black/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37]">
              02 / PIPELINE ARCHITECTURE
            </span>
            <h2 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight">
              How CyberOrbit Works
            </h2>
            <div className="w-16 h-[1px] bg-[#D4AF37] mx-auto" />
            <p className="text-sm text-gray-400 leading-relaxed">
              From raw client event ingestion to adaptive policy containment in sub-15ms.
            </p>
          </div>

          {/* Architecture Pipeline Flow with Thin Gold Lines */}
          <div className="relative">
            {/* Desktop horizontal connecting line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-[1px] bg-[#D4AF37]/30 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6 relative z-10">
              {[
                { step: '01', title: 'TELEMETRY', desc: 'Auth, Device, Network, Egress' },
                { step: '02', title: 'FEATURE EXTRACTION', desc: 'Time, Volume, Baseline Delta' },
                { step: '03', title: 'ML DETECTION', desc: 'Random Forest + Isolation Forest' },
                { step: '04', title: 'RISK ANALYSIS', desc: '0-100 Continuous Score Decay' },
                { step: '05', title: 'XAI ATTRIBUTION', desc: 'Decomposed Risk Factors' },
                { step: '06', title: 'ZERO TRUST POLICY', desc: 'ALLOW, MFA, RESTRICT, FREEZE' },
                { step: '07', title: 'INCIDENT RESPONSE', desc: 'MITRE ATT&CK & Containment' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={`p-6 border border-[#D4AF37]/30 flex flex-col justify-between min-h-[190px] transition-all duration-300 hover:border-[#D4AF37] group ${
                    isDark ? 'bg-[#07080A]' : 'bg-[#F9F9F7]'
                  }`}
                >
                  <div>
                    <div className="font-serif-display text-2xl text-[#D4AF37] mb-2">{item.step}</div>
                    <div className="w-4 h-[1px] bg-[#D4AF37] mb-3 group-hover:w-8 transition-all" />
                    <h4 className="text-xs font-mono font-bold tracking-wider text-gray-200 group-hover:text-[#D4AF37] transition-colors">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-4 leading-relaxed font-sans">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TECHNOLOGIES (Black Full-Width Section with Thin Gold Borders) */}
      <section id="technologies" className="py-24 md:py-36 bg-black text-white border-b border-[#D4AF37]/30">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37] block mb-3">
                03 / FULL-STACK FOUNDATION
              </span>
              <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
                Built with modern technologies
              </h2>
            </div>
            <p className="text-sm text-gray-400 max-w-md font-sans">
              No simulated data layers. Every model calculation, database transaction, and telemetry event runs across authentic enterprise code.
            </p>
          </div>

          {/* Clean Grid of Tech Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {technologies.map((tech, idx) => (
              <div
                key={idx}
                className="p-6 bg-black border border-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-300 group cursor-default"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]/80 group-hover:text-[#D4AF37]">
                    {tech.category}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/40 group-hover:bg-[#D4AF37]" />
                </div>
                <h3 className="font-serif-display text-2xl text-white group-hover:text-[#D4AF37] transition-colors mb-2">
                  {tech.name}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  {tech.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: SECURITY CAPABILITIES (Editorial Feature Blocks with Asymmetric Layout) */}
      <section id="capabilities" className="py-24 md:py-36 border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl mb-20 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37]">
              04 / DEFENSIVE DEPTH
            </span>
            <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight">
              Security Capabilities
            </h2>
            <div className="w-20 h-[1px] bg-[#D4AF37]" />
          </div>

          {/* Asymmetric 2-column editorial feature blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
            {capabilities.map((cap, idx) => (
              <div 
                key={idx}
                className={`border-b border-[#D4AF37]/25 pb-12 transition-all ${
                  idx % 2 === 1 ? 'md:pt-8' : ''
                }`}
              >
                {/* Large Number */}
                <div className="font-serif-display text-5xl sm:text-6xl text-[#D4AF37]/70 mb-4 font-light">
                  {cap.num}
                </div>
                {/* Small gold line */}
                <div className="w-10 h-[1px] bg-[#D4AF37] mb-6" />
                {/* Title */}
                <h3 className="font-serif-display text-3xl font-light mb-4">
                  {cap.title}
                </h3>
                {/* Description */}
                <p className="text-sm text-gray-400 font-sans leading-relaxed max-w-lg">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: AI SECURITY (Visual Diagram of ML Layer) */}
      <section id="ai-security" className={`py-24 md:py-36 border-b border-[#D4AF37]/20 ${isDark ? 'bg-black/60' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37]">
              05 / MACHINE INTELLIGENCE
            </span>
            <h2 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight">
              AI-Powered Security Engine
            </h2>
            <div className="w-16 h-[1px] bg-[#D4AF37] mx-auto" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Real-time progression from behavioral observation to explainable policy enforcement.
            </p>
          </div>

          {/* Visual Diagram: Behavior → ML Prediction → Risk Score → Explainability → Security Decision */}
          <div className={`p-8 md:p-12 border border-[#D4AF37]/30 ${isDark ? 'bg-black' : 'bg-[#F9F9F7]'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
              {/* Step 1: Behavior */}
              <div className="border border-[#D4AF37]/25 p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider mb-2">INPUT STAGE</div>
                  <h4 className="font-serif-display text-2xl font-light mb-2">Behavior</h4>
                  <p className="text-xs text-gray-400">User keystroke tempo, session duration, upload sizes, off-hours access.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 text-[10px] font-mono text-gray-400">
                  Vector: 14 dimensions
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:flex justify-center text-[#D4AF37] font-serif text-2xl">→</div>

              {/* Step 2: ML Prediction */}
              <div className="border border-[#D4AF37]/40 p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider mb-2">ENSEMBLE INFERENCE</div>
                  <h4 className="font-serif-display text-2xl font-light mb-2">ML Prediction</h4>
                  <p className="text-xs text-gray-400">Random Forest (25 trees) + Isolation Forest (100 trees) evaluate probability.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 text-[10px] font-mono text-[#D4AF37]">
                  Anomaly Prob: 89.2%
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:flex justify-center text-[#D4AF37] font-serif text-2xl">→</div>

              {/* Step 3: Risk & XAI & Action */}
              <div className="border border-[#D4AF37]/25 p-6 h-full flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider mb-2">CONTINUOUS PDP</div>
                  <h4 className="font-serif-display text-2xl font-light mb-2">Policy Decision</h4>
                  <p className="text-xs text-gray-400">Risk Score computed, feature attribution decomposed, adaptive countermeasure applied.</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 text-[10px] font-mono text-emerald-400">
                  Enforce: MFA CHALLENGE
                </div>
              </div>
            </div>

            {/* Model Breakdown Bar */}
            <div className="mt-10 pt-8 border-t border-[#D4AF37]/20 grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">CLASSIFIER</span>
                <div className="font-serif-display text-xl text-[#D4AF37] mt-1">Supervised Random Forest</div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">OUTLIER ISOLATION</span>
                <div className="font-serif-display text-xl text-[#D4AF37] mt-1">Unsupervised iForest</div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">DYNAMIC SCORING</span>
                <div className="font-serif-display text-xl text-[#D4AF37] mt-1">Bayesian Trust Decay</div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">TRANSPARENCY</span>
                <div className="font-serif-display text-xl text-[#D4AF37] mt-1">SHAP Factor Attribution</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: TEAM (Minimal Team Cards) */}
      <section id="team" className="py-24 md:py-36 border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="max-w-2xl mb-16 space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37]">
              06 / LEADERSHIP &amp; RESEARCH
            </span>
            <h2 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight">
              Built by the team behind CyberOrbit
            </h2>
            <div className="w-20 h-[1px] bg-[#D4AF37]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, idx) => (
              <div 
                key={idx}
                className={`p-8 border border-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-300 group ${
                  isDark ? 'bg-[#0A0B0E]' : 'bg-white'
                }`}
              >
                {/* Avatar Initial in Minimal Gold Circle */}
                <div className="w-16 h-16 border border-[#D4AF37] flex items-center justify-center mb-6 text-xl font-serif-display text-[#D4AF37]">
                  {member.initials}
                </div>
                <h3 className="font-serif-display text-2xl font-light mb-1">
                  {member.name}
                </h3>
                <div className="text-xs font-mono text-[#D4AF37] mb-4">
                  {member.role}
                </div>
                <div className="w-8 h-[1px] bg-[#D4AF37]/40 mb-4" />
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  {member.responsibility}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: CONTACT (Premium Editorial Form) */}
      <section id="contact" className={`py-24 md:py-36 ${isDark ? 'bg-black' : 'bg-[#F4F4F0]'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left: Contact Statement */}
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#D4AF37] block">
                07 / INQUIRIES &amp; DEPLOYMENT
              </span>
              <h2 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight leading-[1.15]">
                Let's build a safer digital environment.
              </h2>
              <div className="w-20 h-[1px] bg-[#D4AF37]" />
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect with our security architects to discuss zero-trust integration, custom UEBA model tuning, or SIEM deployment requirements.
              </p>

              <div className="space-y-4 pt-6 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37]">EMAIL:</span>
                  <a href="mailto:priyankasamota946@gmail.com" className="hover:text-[#D4AF37] transition-colors">
                    priyankasamota946@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37]">GITHUB:</span>
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                    github.com/samota2004 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#D4AF37]">LINKEDIN:</span>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-[#D4AF37] transition-colors flex items-center gap-1">
                    linkedin.com/in/priyankasamota <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Large Editorial Form */}
            <div className="lg:col-span-7">
              <div className={`p-8 md:p-12 border border-[#D4AF37]/30 ${isDark ? 'bg-[#07080A]' : 'bg-white'}`}>
                {contactSubmitted ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-12 h-12 border border-[#D4AF37] mx-auto flex items-center justify-center text-[#D4AF37]">
                      ✓
                    </div>
                    <h3 className="font-serif-display text-3xl font-light">Inquiry Received</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Thank you for contacting CyberOrbit. Our security engineering team will review your inquiry and follow up shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                          YOUR NAME
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="e.g. Eleanor Vance"
                          className={`w-full px-4 py-3 border text-sm outline-none transition-all ${
                            isDark 
                              ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                              : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
                          }`}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                          EMAIL ADDRESS
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="e.g. e.vance@enterprise.com"
                          className={`w-full px-4 py-3 border text-sm outline-none transition-all ${
                            isDark 
                              ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                              : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                        ORGANIZATION / ENTERPRISE
                      </label>
                      <input
                        type="text"
                        value={contactForm.organization}
                        onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })}
                        placeholder="e.g. Global Defense & Aerospace"
                        className={`w-full px-4 py-3 border text-sm outline-none transition-all ${
                          isDark 
                            ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                            : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
                        MESSAGE / REQUIREMENTS
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Detail your architecture requirements, model training questions, or deployment scope..."
                        className={`w-full px-4 py-3 border text-sm outline-none transition-all ${
                          isDark 
                            ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]' 
                            : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-8 py-3.5 text-xs font-semibold tracking-[0.2em] uppercase border border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37] transition-all duration-300 cursor-pointer flex items-center gap-3"
                    >
                      <span>TRANSMIT INQUIRY</span>
                      <span className="font-serif">→</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className={`py-16 border-t border-[#D4AF37]/20 ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border border-[#D4AF37] flex items-center justify-center rotate-45">
              <div className="w-2.5 h-2.5 bg-[#D4AF37]" />
            </div>
            <div>
              <div className="font-serif-display text-xl tracking-[0.15em]">CYBERORBIT</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                Zero Trust &amp; UEBA Security Platform
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 font-mono tracking-wider text-center md:text-right">
            &copy; {new Date().getFullYear()} CYBERORBIT. ALL RIGHTS RESERVED. NIST SP 800-207 COMPLIANT.
          </div>
        </div>
      </footer>
    </div>
  );
};
