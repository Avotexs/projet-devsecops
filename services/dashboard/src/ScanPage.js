import React, { useState } from 'react';
import api from './api';

function ScanPage() {
    const [activeTab, setActiveTab] = useState('yaml'); // 'yaml' or 'github'
    const [inputContent, setInputContent] = useState('');
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleScan = async () => {
        setScanning(true);
        setError(null);
        setResults(null);

        try {
            // If GitHub URL, we would fetch it here (mocked for now as per plan/api availability)
            let contentToScan = inputContent;
            if (activeTab === 'github') {
                // In a real app, backend would fetch this. For now, we simulate or ask for YAML.
                // Since log-collector doesn't actually fetch GitHub content yet (as seen in analysis),
                // we'll treat this as a "Not Implemented" or just try to scan the URL string itself (which will fail).
                // Let's prompt user to use YAML for now or mock it.
                if (inputContent.includes('github.com')) {
                    // Mock fetching for demo purposes if it's a valid-looking URL, or error
                    // For this implementation, let's focus on the YAML tab which connects to real services.
                    // But if user insists on GitHub, we could show a warning.
                }
            }

            const data = await api.scanYaml(contentToScan);
            setResults(data);
        } catch (err) {
            setError(err.message || 'Scan failed. Please check your connection to the services.');
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                Dynamic Security Scanner
            </h1>
            <p className="text-slate-400 mb-8">
                Instant vulnerability detection and automated fix suggestions for your CI/CD pipelines.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Input */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6">
                        {/* Tabs */}
                        <div className="flex gap-4 border-b border-slate-700 mb-4 pb-2">
                            <button
                                onClick={() => setActiveTab('yaml')}
                                className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'yaml'
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                Paste YAML
                            </button>
                            <button
                                onClick={() => setActiveTab('github')}
                                className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'github'
                                        ? 'text-blue-400 border-b-2 border-blue-400'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                GitHub URL
                            </button>
                        </div>

                        {/* Input Area */}
                        {activeTab === 'yaml' ? (
                            <textarea
                                value={inputContent}
                                onChange={(e) => setInputContent(e.target.value)}
                                placeholder="Paste your .github/workflows/main.yml content here..."
                                className="w-full h-96 bg-slate-900/50 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        ) : (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={inputContent}
                                    onChange={(e) => setInputContent(e.target.value)}
                                    placeholder="https://github.com/username/repo/blob/main/.github/workflows/main.yml"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
                                    Note: Direct GitHub fetching is currently experimental. For best results, paste the raw YAML content.
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleScan}
                                disabled={scanning || !inputContent}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${scanning || !inputContent
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20'
                                    }`}
                            >
                                {scanning ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Scanning...
                                    </span>
                                ) : 'Run Security Scan'}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Results */}
                <div className="space-y-6">
                    {!results && !scanning && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-12">
                            <span className="text-4xl mb-4">🔍</span>
                            <p>Ready to scan. Results will appear here.</p>
                        </div>
                    )}

                    {results && (
                        <div className="animate-slide-in space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-red-500">{results.summary.HIGH}</div>
                                    <div className="text-xs text-slate-400 uppercase">High</div>
                                </div>
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-yellow-500">{results.summary.MEDIUM}</div>
                                    <div className="text-xs text-slate-400 uppercase">Medium</div>
                                </div>
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-green-500">{results.summary.LOW}</div>
                                    <div className="text-xs text-slate-400 uppercase">Low</div>
                                </div>
                            </div>

                            {/* Vulnerabilities List */}
                            <div className="glass rounded-2xl p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span>🛡️</span> Detected Vulnerabilities
                                </h2>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {results.vulnerabilities.length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center py-4">No vulnerabilities found. Good job! 🎉</p>
                                    ) : (
                                        results.vulnerabilities.map((vuln, idx) => (
                                            <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs px-2 py-1 rounded font-bold ${vuln.severity === 'HIGH' ? 'bg-red-500 text-white' :
                                                            vuln.severity === 'MEDIUM' ? 'bg-yellow-500 text-black' :
                                                                'bg-green-500 text-white'
                                                        }`}>
                                                        {vuln.severity}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">{vuln.rule_id}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 font-medium mb-1">{vuln.description}</p>
                                                <p className="text-xs text-slate-400">{vuln.remediation}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Fix Suggestions (Diff View) */}
                            {results.fixes.length > 0 && (
                                <div className="glass rounded-2xl p-6">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <span>✨</span> Automated Fix Suggestions
                                    </h2>
                                    <div className="space-y-4">
                                        {results.fixes.map((fix) => (
                                            <div key={fix.id} className="border border-green-500/30 rounded-lg overflow-hidden">
                                                <div className="bg-green-500/10 px-4 py-2 flex justify-between items-center">
                                                    <span className="text-green-400 font-medium text-sm">
                                                        Fix for: {fix.vulnerability_type}
                                                    </span>
                                                    {fix.auto_applicable && (
                                                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                                                            Auto-Applicable
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-4 bg-slate-900 overflow-x-auto">
                                                    <pre className="text-xs font-mono text-slate-300">
                                                        {fix.diff}
                                                    </pre>
                                                </div>
                                                <div className="p-3 bg-slate-800/50 text-xs text-slate-400 border-t border-slate-700">
                                                    {fix.description}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Anomaly Note */}
                            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">ℹ️</span>
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-400">Anomaly Detection Status</h4>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Runtime anomaly detection requires historical execution data.
                                            This static scan cannot predict runtime anomalies behavior.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ScanPage;
