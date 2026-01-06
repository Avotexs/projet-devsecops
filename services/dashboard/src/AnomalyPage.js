import React, { useState } from 'react';
import api from './api';

// Simulated execution data generator
function generateSampleExecutions(count = 10, includeAnomaly = true) {
    const now = new Date();
    const executions = [];

    for (let i = 0; i < count; i++) {
        const isAnomaly = includeAnomaly && i === count - 2; // Make second-to-last an anomaly

        executions.push({
            timestamp: new Date(now.getTime() - (count - i) * 3600000).toISOString(), // 1 hour apart
            duration_ms: isAnomaly ? 45000 : 5000 + Math.random() * 2000, // Anomaly has 9x duration
            status: isAnomaly ? 'slow' : 'success',
            resource_usage: {
                cpu: isAnomaly ? 95 : 20 + Math.random() * 30,
                memory: isAnomaly ? 85 : 40 + Math.random() * 20
            }
        });
    }

    return executions;
}

function AnomalyPage() {
    const [jobId, setJobId] = useState('build-pipeline-main');
    const [executionCount, setExecutionCount] = useState(10);
    const [includeAnomaly, setIncludeAnomaly] = useState(true);
    const [useAutoencoder, setUseAutoencoder] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [executions, setExecutions] = useState([]);

    const handleGenerateData = () => {
        const data = generateSampleExecutions(executionCount, includeAnomaly);
        setExecutions(data);
        setResults(null);
    };

    const handleAnalyze = async () => {
        if (executions.length === 0) {
            setError('Please generate execution data first');
            return;
        }

        setAnalyzing(true);
        setError(null);

        try {
            const response = await api.detectAnomalies(jobId, executions, useAutoencoder);
            setResults(response);
        } catch (err) {
            setError(err.message || 'Anomaly detection failed');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                Anomaly Detection Lab
            </h1>
            <p className="text-slate-400 mb-8">
                Test ML-powered behavioral anomaly detection with simulated CI/CD execution data.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Configuration */}
                <div className="space-y-6">
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>⚙️</span> Configuration
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Job ID</label>
                                <input
                                    type="text"
                                    value={jobId}
                                    onChange={(e) => setJobId(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">
                                    Number of Executions: {executionCount}
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={executionCount}
                                    onChange={(e) => setExecutionCount(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="includeAnomaly"
                                    checked={includeAnomaly}
                                    onChange={(e) => setIncludeAnomaly(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <label htmlFor="includeAnomaly" className="text-sm text-slate-300">
                                    Include simulated anomaly (1 outlier)
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="useAutoencoder"
                                    checked={useAutoencoder}
                                    onChange={(e) => setUseAutoencoder(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <label htmlFor="useAutoencoder" className="text-sm text-slate-300">
                                    Use Autoencoder (requires more data)
                                </label>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleGenerateData}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                Generate Data
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing || executions.length === 0}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${analyzing || executions.length === 0
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                    }`}
                            >
                                {analyzing ? 'Analyzing...' : 'Run ML Analysis'}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Execution Data Preview */}
                    {executions.length > 0 && (
                        <div className="glass rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span>📊</span> Execution Data Preview
                            </h2>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {executions.map((exec, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg text-xs font-mono ${exec.duration_ms > 10000
                                                ? 'bg-red-500/20 border border-red-500/30'
                                                : 'bg-slate-800/50'
                                            }`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">#{idx + 1}</span>
                                            <span className={exec.duration_ms > 10000 ? 'text-red-400' : 'text-green-400'}>
                                                {(exec.duration_ms / 1000).toFixed(1)}s
                                            </span>
                                        </div>
                                        <div className="text-slate-500 mt-1">
                                            CPU: {exec.resource_usage.cpu.toFixed(0)}% | Memory: {exec.resource_usage.memory.toFixed(0)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Results */}
                <div className="space-y-6">
                    {!results && !analyzing && (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl p-12">
                            <span className="text-4xl mb-4">🧠</span>
                            <p>Generate data and run ML analysis to see results</p>
                        </div>
                    )}

                    {results && (
                        <div className="animate-slide-in space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-blue-400">{results.total_executions}</div>
                                    <div className="text-xs text-slate-400 uppercase">Analyzed</div>
                                </div>
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-red-400">{results.anomalies_found}</div>
                                    <div className="text-xs text-slate-400 uppercase">Anomalies</div>
                                </div>
                                <div className="glass p-4 rounded-xl text-center">
                                    <div className="text-lg font-bold text-purple-400">{results.model_used}</div>
                                    <div className="text-xs text-slate-400 uppercase">Model</div>
                                </div>
                            </div>

                            {/* Results List */}
                            <div className="glass rounded-2xl p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span>🔍</span> Detection Results
                                </h2>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {results.results.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg border-l-4 ${result.is_anomaly
                                                    ? 'border-red-500 bg-red-500/10'
                                                    : 'border-green-500 bg-green-500/5'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${result.is_anomaly ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                                                    }`}>
                                                    {result.is_anomaly ? 'ANOMALY' : 'NORMAL'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    Score: {result.anomaly_score.toFixed(3)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300">{result.description}</p>
                                            {result.anomaly_type && (
                                                <p className="text-xs text-purple-400 mt-1">
                                                    Type: {result.anomaly_type}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stats */}
                            {results.summary && (
                                <div className="glass rounded-2xl p-6">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <span>📈</span> Feature Statistics
                                    </h2>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-slate-300">
                                                {(results.summary.feature_stats?.mean_duration / 1000 || 0).toFixed(1)}s
                                            </div>
                                            <div className="text-xs text-slate-500">Mean Duration</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-slate-300">
                                                {(results.summary.feature_stats?.std_duration / 1000 || 0).toFixed(1)}s
                                            </div>
                                            <div className="text-xs text-slate-500">Std Deviation</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-slate-300">
                                                {((results.summary.anomaly_rate || 0) * 100).toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-slate-500">Anomaly Rate</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AnomalyPage;
